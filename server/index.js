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
  console.log(`[DEBUG] Fetching hospitals with phone numbers for: ${lat}, ${lng}`);

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: "Lat/Lng required" });
  }

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  // 1. Try Google Places API (Two-step fetch for phone numbers)
  if (API_KEY && API_KEY !== 'your_google_maps_key_here') {
    try {
      console.log(`[DEBUG] Step 1: Google Nearby Search...`);
      const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=hospital&key=${API_KEY}`;
      const response = await axios.get(googleUrl);

      if (response.data.status === 'OK') {
        const top5 = response.data.results.slice(0, 5);
        
        // Step 2: Fetch Details for each to get phone number
        const detailedHospitals = await Promise.all(top5.map(async (place) => {
          try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number&key=${API_KEY}`;
            const detailsRes = await axios.get(detailsUrl);
            return {
              name: place.name,
              address: place.vicinity,
              location: place.geometry.location,
              phone: detailsRes.data.result?.formatted_phone_number || null
            };
          } catch (err) {
            console.error(`[ERROR] Details fetch failed for ${place.name}:`, err.message);
            return {
              name: place.name,
              address: place.vicinity,
              location: place.geometry.location,
              phone: null
            };
          }
        }));

        return res.status(200).json({ success: true, source: 'google', results: detailedHospitals });
      }
    } catch (err) {
      console.error(`[ERROR] Google API Flow Failed:`, err.message);
    }
  }

  // 2. Fallback to OpenStreetMap (No phone numbers available in basic Overpass node search easily)
  try {
    console.log(`[DEBUG] Falling back to OpenStreetMap...`);
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${lat},${lng})["amenity"="hospital"];out;`;
    const response = await axios.get(overpassUrl, { timeout: 8000 });

    if (response.data && response.data.elements) {
      const hospitals = response.data.elements.map(place => ({
        name: place.tags.name || "Nearby Medical Center",
        address: place.tags["addr:full"] || "Emergency Services",
        location: { lat: place.lat, lng: place.lon },
        phone: null
      })).slice(0, 5);
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
      { name: "City General Hospital", address: "Medical Zone A", location: { lat: parseFloat(lat) + 0.01, lng: parseFloat(lng) + 0.01 }, phone: "+91 9999999999" },
      { name: "Metro Trauma Center", address: "Emergency Sector B", location: { lat: parseFloat(lat) - 0.01, lng: parseFloat(lng) - 0.01 }, phone: "+91 8888888888" }
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
