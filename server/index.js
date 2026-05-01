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
  console.log(`[DEBUG] Incoming /send-alert request:`, req.body);
  try {
    const { contacts, latitude, longitude } = req.body;

    // 1. Validation
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, error: "Contacts array is required." });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: "Location coordinates are missing." });
    }

    // 2. Format Phone Numbers (Fast2SMS expects 10 digits for Indian numbers)
    const formattedNumbers = contacts.map(num => {
      let clean = num.replace(/\D/g, '');
      // If it starts with 91 and is 12 digits, take the last 10
      if (clean.startsWith('91') && clean.length === 12) {
        clean = clean.substring(2);
      }
      return clean;
    }).filter(num => num.length === 10).join(',');

    if (!formattedNumbers) {
      return res.status(400).json({ success: false, error: "No valid 10-digit Indian phone numbers provided." });
    }

    // 3. Generate Message
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const messageBody = `🚨 EMERGENCY ALERT!\nAccident detected at this location:\n${mapsLink}\n\nPlease help!`;

    console.log(`[DEBUG] Final Numbers: ${formattedNumbers}`);
    console.log(`[DEBUG] Message: ${messageBody}`);

    // 4. Fast2SMS API Call
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

    console.log(`[DEBUG] Fast2SMS Response:`, response.data);

    if (response.data && response.data.return === true) {
      return res.status(200).json({
        success: true,
        message: "Emergency SMS sent successfully",
        request_id: response.data.request_id
      });
    } else {
      throw new Error(response.data.message || "Fast2SMS API returned failure");
    }

  } catch (error) {
    const errorDetail = error.response?.data || error.message;
    console.error("[ERROR] SMS Dispatch Failed:", errorDetail);
    return res.status(500).json({
      success: false,
      error: "Failed to send SMS. Try again.",
      detail: errorDetail
    });
  }
});

/**
 * API Endpoint: /nearby-hospitals
 * Purpose: Proxies request to Google Places API to find hospitals
 */
app.get('/nearby-hospitals', async (req, res) => {
  const { lat, lng } = req.query;
  console.log(`[DEBUG] Fetching hospitals for: ${lat}, ${lng}`);

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: "Lat/Lng required" });
  }

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  // 1. Try Google Places API first
  if (API_KEY && API_KEY !== 'your_google_maps_key_here') {
    try {
      console.log(`[DEBUG] Attempting Google Places API...`);
      const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=hospital&key=${API_KEY}`;
      const response = await axios.get(googleUrl);

      if (response.data.status === 'OK') {
        const hospitals = response.data.results.map(place => ({
          name: place.name,
          address: place.vicinity,
          location: place.geometry.location,
        }));
        return res.status(200).json({ success: true, source: 'google', results: hospitals });
      }
      console.warn(`[WARN] Google API Status: ${response.data.status}`);
    } catch (err) {
      console.error(`[ERROR] Google API Failed:`, err.message);
    }
  }

  // 2. Fallback to OpenStreetMap
  try {
    console.log(`[DEBUG] Falling back to OpenStreetMap...`);
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${lat},${lng})["amenity"="hospital"];out;`;
    const response = await axios.get(overpassUrl, { timeout: 8000 });

    if (response.data && response.data.elements) {
      const hospitals = response.data.elements.map(place => ({
        name: place.tags.name || "Nearby Medical Center",
        address: place.tags["addr:full"] || "Emergency Services",
        location: { lat: place.lat, lng: place.lon },
      })).slice(0, 10);
      return res.status(200).json({ success: true, source: 'openstreetmap', results: hospitals });
    }
  } catch (err) {
    console.error(`[ERROR] OSM API Failed:`, err.message);
  }

  // 3. Last Resort: Mock Data
  return res.status(200).json({
    success: true,
    source: 'mock',
    results: [
      { name: "City Hospital (Demo)", address: "Medical Zone A", location: { lat: parseFloat(lat) + 0.01, lng: parseFloat(lng) + 0.01 } },
      { name: "Global Trauma Center (Demo)", address: "Emergency Sector B", location: { lat: parseFloat(lat) - 0.01, lng: parseFloat(lng) - 0.01 } }
    ]
  });
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
