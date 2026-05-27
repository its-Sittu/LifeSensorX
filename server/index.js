const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

const PORT = process.env.PORT || 5000;

// In-Memory Data Store (No Database Required)
let hospitals = [
  {
    _id: "hosp_1",
    name: "Central General Hospital",
    address: "123 Main St",
    location: { lat: 28.6139, lng: 77.2090 },
    beds: { 
      total: 100, occupied: 50, available: 50, 
      icu: { total: 20, occupied: 15, available: 5 }, 
      emergency: { total: 10, occupied: 8, available: 2 } 
    },
    doctorsAvailable: 5,
    emergencySupport: true,
    createdAt: new Date()
  }
];
let patients = [];

// Utils
const { calculateWaitTime } = require('./utils/prediction');
// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
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
  const { lat, lng, query } = req.query;

  if (query) {
    console.log(`[DEBUG] Fetching hospitals by query: ${query}`);
  } else {
    console.log(`[DEBUG] Fetching hospitals with phone numbers for: ${lat}, ${lng}`);
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: "Lat/Lng or query required" });
    }
  }

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  // 1. Try Google Places API (Try New API first, fallback to Legacy/Classic API)
  if (API_KEY && API_KEY !== 'your_google_maps_key_here') {
    // 1a. Try Google Places Text Search (New) if query is provided
    if (query) {
      try {
        console.log(`[DEBUG] Step 1a: Google Text Search (New)...`);
        const googleTextRes = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          {
            textQuery: `hospitals in ${query}`,
            maxResultCount: 5
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': API_KEY,
              'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber'
            }
          }
        );

        if (googleTextRes.data && googleTextRes.data.places) {
          const hospitals = googleTextRes.data.places.map(place => ({
            name: place.displayName?.text || 'Hospital',
            address: place.formattedAddress || 'Nearby Services',
            location: {
              lat: place.location?.latitude,
              lng: place.location?.longitude
            },
            phone: place.internationalPhoneNumber || null
          }));
          console.log(`[DEBUG] Google Places Text Search (New) fetched successfully.`);
          return res.status(200).json({ success: true, source: 'google_new_text', results: hospitals });
        }
      } catch (err) {
        console.log(`[DEBUG] Google Places Text Search (New) failed or is disabled:`, err.message);
      }
    }

    // 1b. Try Google Places API (New) - Nearby Search
    if (lat && lng) {
      try {
        console.log(`[DEBUG] Step 1b: Google Nearby Search (New)...`);
        const googleNewRes = await axios.post(
          'https://places.googleapis.com/v1/places:searchNearby',
          {
            includedTypes: ['hospital'],
            maxResultCount: 5,
            locationRestriction: {
              circle: {
                center: {
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng)
                },
                radius: 10000.0
              }
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': API_KEY,
              'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber'
            }
          }
        );

        if (googleNewRes.data && googleNewRes.data.places) {
          const hospitals = googleNewRes.data.places.map(place => ({
            name: place.displayName?.text || 'Hospital',
            address: place.formattedAddress || 'Nearby Services',
            location: {
              lat: place.location?.latitude,
              lng: place.location?.longitude
            },
            phone: place.internationalPhoneNumber || null
          }));
          console.log(`[DEBUG] Google Places API (New) fetched successfully.`);
          return res.status(200).json({ success: true, source: 'google_new', results: hospitals });
        }
      } catch (err) {
        console.log(`[DEBUG] Google Places API (New) failed or is disabled:`, err.message);
      }
    }

    // 1b. Try Google Places API (Legacy/Classic) as secondary option
    try {
      console.log(`[DEBUG] Step 1b: Google Nearby Search (Legacy)...`);
      const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=hospital&key=${API_KEY}`;
      const response = await axios.get(googleUrl);

      console.log(`[DEBUG] Google API Status: ${response.data.status}`);
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
      console.error(`[ERROR] Google API Legacy Flow Failed:`, err.message);
    }
  }

  // 2. Fallback to OpenStreetMap (No phone numbers available in basic Overpass node search easily)
  try {
    console.log(`[DEBUG] Falling back to OpenStreetMap...`);
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${lat},${lng})["amenity"="hospital"];out;`;
    const response = await axios.get(overpassUrl, { 
      timeout: 8000,
      headers: {
        'User-Agent': 'LifeSensorX-Emergency-App/1.0'
      }
    });

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
      { name: "City General Hospital (Mock)", address: "Medical Zone A", location: { lat: parseFloat(lat) + 0.01, lng: parseFloat(lng) + 0.01 }, phone: "+91 9999999999" },
      { name: "Metro Trauma Center (Mock)", address: "Emergency Sector B", location: { lat: parseFloat(lat) - 0.01, lng: parseFloat(lng) - 0.01 }, phone: "+91 8888888888" }
    ]
  });
});

/**
 * HOSPITAL MANAGEMENT API ENDPOINTS (IN-MEMORY)
 */

// 1. Get Hospital Stats
app.get('/api/hospitals', (req, res) => {
  res.json({ success: true, data: hospitals });
});

// 1b. Update Bed Counts
app.put('/api/hospitals/:id/beds', (req, res) => {
  try {
    const { type, action } = req.body; // type: 'icu', 'emergency', 'general'. action: 'allocate', 'free'
    const hospital = hospitals.find(h => h._id === req.params.id) || hospitals[0];
    
    let target = null;
    if (type === 'icu') target = hospital.beds.icu;
    else if (type === 'emergency') target = hospital.beds.emergency;
    else target = hospital.beds; // 'general' maps to total

    if (!target) return res.status(400).json({ error: 'Invalid bed type' });

    if (action === 'allocate' && target.available > 0) {
      target.occupied++;
      target.available--;
    } else if (action === 'free' && target.occupied > 0) {
      target.occupied--;
      target.available++;
    }

    // Recalculate total if we updated a subtype
    if (type !== 'general') {
      hospital.beds.occupied = hospital.beds.icu.occupied + hospital.beds.emergency.occupied;
      // Assume total beds is static, available = total - occupied
      hospital.beds.available = hospital.beds.total - hospital.beds.occupied;
    }

    io.emit('hospitalUpdate', { hospitalId: hospital._id, beds: hospital.beds });
    res.json({ success: true, data: hospital.beds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create a new hospital (for testing)
app.post('/api/hospitals', (req, res) => {
  const newHospital = {
    _id: "hosp_" + Date.now(),
    ...req.body,
    createdAt: new Date()
  };
  hospitals.push(newHospital);
  io.emit('hospitalUpdate', newHospital);
  res.status(201).json({ success: true, data: newHospital });
});

// 3. Get Patient Queue
app.get('/api/queue', (req, res) => {
  // Sort by arrival time
  const sortedPatients = [...patients].sort((a, b) => new Date(a.arrivalTime) - new Date(b.arrivalTime));
  res.json({ success: true, data: sortedPatients });
});

// 4. Add Patient to Queue
app.post('/api/queue', (req, res) => {
  try {
    const { hospitalId, ...patientData } = req.body;
    let hospital = hospitals.find(h => h._id === hospitalId) || hospitals[0];

    const currentQueue = patients.filter(p => p.hospitalId === hospital._id && p.status === 'WAITING');
    
    // Predict Wait Time
    const waitTime = calculateWaitTime(currentQueue, patientData, hospital.doctorsAvailable);
    
    const newPatient = {
      _id: "pat_" + Date.now(),
      hospitalId: hospital._id,
      ...patientData,
      status: patientData.status || 'WAITING',
      severity: patientData.severity || 'MEDIUM',
      consultationType: patientData.consultationType || 'GENERAL',
      arrivalTime: new Date(),
      estimatedWaitTime: waitTime
    };

    patients.push(newPatient);
    
    // Emit real-time update
    io.emit('queueUpdate', { action: 'add', data: newPatient });
    
    res.status(201).json({ success: true, data: newPatient });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. Update Patient Status (e.g., ADMITTED)
app.put('/api/queue/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const patientIndex = patients.findIndex(p => p._id === req.params.id);
    
    if (patientIndex === -1) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }

    patients[patientIndex].status = status;
    
    // Emit real-time update
    io.emit('queueUpdate', { action: 'update', data: patients[patientIndex] });
    
    res.json({ success: true, data: patients[patientIndex] });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Health Check
app.get('/', (req, res) => {
  res.send("LifeSensorX Emergency API (Fast2SMS Edition) is running...");
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Emergency Backend running on port ${PORT}`);
  console.log(`🔗 Fast2SMS integration active.`);
});
