const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * API Endpoint: /send-alert
 * Purpose: Sends emergency SMS via Fast2SMS
 */
app.post('/send-alert', async (req, res) => {
  try {
    const { contacts, latitude, longitude } = req.body;

    // 1. Validation
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Contacts array is required." 
      });
    }

    if (contacts.length > 5) {
      return res.status(400).json({ 
        success: false, 
        error: "Maximum 5 contacts allowed for safety." 
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: "Location coordinates (lat/long) are missing." 
      });
    }

    // 2. Format Phone Numbers (Fast2SMS expects comma separated string)
    // Ensure numbers are clean (digits only)
    const formattedNumbers = contacts.map(num => num.replace(/\D/g, '')).join(',');

    // 3. Generate Dynamic Emergency Message
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const messageBody = `🚨 Emergency Alert!\nPossible accident detected.\n\n📍 Location:\n${mapsLink}\n\nPlease help immediately.`;

    console.log(`Sending Emergency SMS to: ${formattedNumbers}`);

    // 4. Fast2SMS Integration
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: "q",
      message: messageBody,
      language: "english",
      numbers: formattedNumbers,
    }, {
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      }
    });

    // 5. Handle Fast2SMS Response
    if (response.data && response.data.return === true) {
      console.log('✅ SMS sent successfully:', response.data.message);
      return res.status(200).json({
        success: true,
        message: "Emergency alerts dispatched successfully via Fast2SMS.",
        request_id: response.data.request_id
      });
    } else {
      console.error('❌ Fast2SMS error:', response.data);
      throw new Error(response.data.message || "Fast2SMS failed to send message");
    }

  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message || "Internal Server Error";
    console.error("Critical Backend Error:", errorMsg);
    
    return res.status(500).json({
      success: false,
      error: errorMsg
    });
  }
});

// Health Check
app.get('/', (req, res) => {
  res.send("LifeSensorX Emergency API (Fast2SMS Edition) is running...");
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Emergency Backend running on port ${PORT}`);
  console.log(`🔗 Fast2SMS integration active.`);
});
