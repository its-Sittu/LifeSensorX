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

/**
 * API Endpoint: /nearby-hospitals
 * Purpose: Proxies request to Google Places API to find hospitals
 */
app.get('/nearby-hospitals', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: "Latitude and Longitude are required." });
    }

    // Using OpenStreetMap's Overpass API (100% Free, No Key Required)
    // We search for 'hospital' amenity within 10km radius
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${lat},${lng})["amenity"="hospital"];out;`;
    
    console.log(`Fetching free hospital data from OpenStreetMap for ${lat}, ${lng}...`);
    
    const response = await axios.get(overpassUrl, { timeout: 10000 });

    if (response.data && response.data.elements) {
      const hospitals = response.data.elements.map(place => ({
        name: place.tags.name || "Unknown Medical Center",
        address: place.tags["addr:full"] || place.tags["addr:street"] || "Emergency Services",
        location: { lat: place.lat, lng: place.lon },
        type: place.tags.amenity
      })).slice(0, 10);

      console.log(`Successfully found ${hospitals.length} hospitals.`);

      return res.status(200).json({
        success: true,
        source: 'openstreetmap',
        results: hospitals
      });
    } else {
      throw new Error("Invalid response from OpenStreetMap");
    }

  } catch (error) {
    console.error("Hospitals Search Error (OSM):", error.message);
    
    // Fallback to local mock data if the free API is down or throttled
    return res.status(200).json({
      success: true,
      source: 'mock',
      results: [
        { name: "City General Hospital", address: "123 Medical Dr, City Center", location: { lat: parseFloat(lat) + 0.01, lng: parseFloat(lng) + 0.01 } },
        { name: "Metro Trauma Center", address: "456 Emergency Rd, East Side", location: { lat: parseFloat(lat) - 0.02, lng: parseFloat(lng) + 0.01 } },
        { name: "Westside Emergency", address: "789 Health Ave, West Side", location: { lat: parseFloat(lat) + 0.01, lng: parseFloat(lng) - 0.02 } }
      ]
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
