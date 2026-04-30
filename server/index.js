const express = require('express');
const twilio = require('twilio');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger (Debug)
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Twilio Client Initialization
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * API Endpoint to send emergency alerts
 * Method: POST
 * Body: { contacts: [], latitude: "", longitude: "" }
 */
app.post('/send-alert', async (req, res) => {
  try {
    const { contacts, latitude, longitude } = req.body;

    // 1. Validation
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, error: "Contacts array is required." });
    }

    if (contacts.length > 5) {
      return res.status(400).json({ success: false, error: "Maximum 5 contacts allowed for security." });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: "Location data (lat/long) is missing." });
    }

    // 2. Generate Message
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const messageBody = `🚨 Emergency Alert!\nA possible accident has been detected.\n\n📍 Location:\n${mapsLink}\n\nPlease help immediately.`;

    console.log(`Sending alerts to ${contacts.length} numbers...`);

    // 3. Send SMS to each contact
    const sendResults = await Promise.allSettled(
      contacts.map(number => 
        client.messages.create({
          body: messageBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: number
        })
      )
    );

    // 4. Analyze Results
    const successful = sendResults.filter(r => r.status === 'fulfilled').length;
    const failed = sendResults.filter(r => r.status === 'rejected').length;

    console.log(`Results - Success: ${successful}, Failed: ${failed}`);

    if (successful > 0) {
      return res.status(200).json({
        success: true,
        message: `Alerts sent to ${successful} contacts.`,
        failedCount: failed
      });
    } else {
      throw new Error("All SMS attempts failed.");
    }

  } catch (error) {
    console.error("Server Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error"
    });
  }
});

// Health Check
app.get('/', (req, res) => {
  res.send("LifeSensorX Emergency API is Running...");
});

// Listen on all interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Emergency Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Accessible at http://10.17.171.188:${PORT}`);
});
