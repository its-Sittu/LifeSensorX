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

// In-Memory Data Store (Production-resilient fallback)
let hospitals = [
  {
    _id: "hosp_1",
    name: "Central General Hospital",
    address: "123 Main St, New Delhi",
    location: { lat: 28.6139, lng: 77.2090 },
    beds: { 
      total: 100, occupied: 45, available: 55, 
      icu: { total: 20, occupied: 12, available: 8 }, 
      emergency: { total: 15, occupied: 7, available: 8 } 
    },
    doctorsAvailable: 6,
    emergencySupport: true,
    phone: "+91 11 2338 5000",
    createdAt: new Date()
  },
  {
    _id: "hosp_2",
    name: "Metro Trauma & Critical Care",
    address: "45 Emergency Corridor, New Delhi",
    location: { lat: 28.6250, lng: 77.2180 },
    beds: { 
      total: 80, occupied: 50, available: 30, 
      icu: { total: 25, occupied: 15, available: 10 }, 
      emergency: { total: 20, occupied: 10, available: 10 } 
    },
    doctorsAvailable: 8,
    emergencySupport: true,
    phone: "+91 11 2341 8000",
    createdAt: new Date()
  }
];
let patients = [];

// Utils
const { calculateWaitTime } = require('./utils/prediction');
const { scoreAndRankHospitals } = require('./utils/scoring');

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
 * Purpose: Sends emergency SMS via Fast2SMS with Maps link
 */
app.post('/send-alert', async (req, res) => {
  console.log(`[DEBUG] Incoming /send-alert request:`, req.body);
  try {
    const { contacts, latitude, longitude } = req.body;

    // 1. Validation
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, error: "Contacts array is required." });
    }

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, error: "Location coordinates are missing." });
    }

    // 2. Format Phone Numbers (Fast2SMS expects 10 digits for Indian numbers)
    const formattedNumbers = contacts.map(num => {
      let clean = String(num).replace(/\D/g, '');
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
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
      console.warn(`[WARN] FAST2SMS_API_KEY is not configured. Simulating SMS dispatch in development.`);
      return res.status(200).json({
        success: true,
        message: "Emergency SMS simulated successfully (Demo mode)",
        request_id: "sim_" + Date.now()
      });
    }

    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: "q",
      message: messageBody,
      language: "english",
      numbers: formattedNumbers,
    }, {
      headers: {
        'authorization': apiKey,
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
 * Purpose: Proxies request to Google Places API / OpenStreetMap and enriches with explainable AI recommendation scoring
 */
app.get('/nearby-hospitals', async (req, res) => {
  const { lat, lng, query } = req.query;

  const userLat = lat ? parseFloat(lat) : null;
  const userLng = lng ? parseFloat(lng) : null;

  if (query) {
    console.log(`[DEBUG] Fetching hospitals by query: ${query}`);
  } else {
    console.log(`[DEBUG] Fetching hospitals with phone numbers for: ${lat}, ${lng}`);
    if (userLat === null || userLng === null || isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ success: false, error: "Valid latitude and longitude or search query required" });
    }
  }

  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  let rawHospitals = [];
  let source = 'mock';

  // 1. Try Google Places API
  if (API_KEY && API_KEY !== 'your_google_maps_key_here') {
    // 1a. Google Places Text Search (New)
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

        if (googleTextRes.data && googleTextRes.data.places && googleTextRes.data.places.length > 0) {
          rawHospitals = googleTextRes.data.places.map(place => ({
            name: place.displayName?.text || 'Hospital',
            address: place.formattedAddress || 'Nearby Services',
            location: {
              lat: place.location?.latitude,
              lng: place.location?.longitude
            },
            phone: place.internationalPhoneNumber || null
          }));
          source = 'google_new_text';
        }
      } catch (err) {
        console.log(`[DEBUG] Google Places Text Search (New) failed:`, err.message);
      }
    }

    // 1b. Google Places API (New) - Nearby Search
    if (rawHospitals.length === 0 && userLat !== null && userLng !== null) {
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
                  latitude: userLat,
                  longitude: userLng
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

        if (googleNewRes.data && googleNewRes.data.places && googleNewRes.data.places.length > 0) {
          rawHospitals = googleNewRes.data.places.map(place => ({
            name: place.displayName?.text || 'Hospital',
            address: place.formattedAddress || 'Nearby Services',
            location: {
              lat: place.location?.latitude,
              lng: place.location?.longitude
            },
            phone: place.internationalPhoneNumber || null
          }));
          source = 'google_new';
        }
      } catch (err) {
        console.log(`[DEBUG] Google Places API (New) failed:`, err.message);
      }
    }

    // 1c. Google Places API (Legacy/Classic)
    if (rawHospitals.length === 0 && userLat !== null && userLng !== null) {
      try {
        console.log(`[DEBUG] Step 1c: Google Nearby Search (Legacy)...`);
        const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLat},${userLng}&radius=10000&type=hospital&key=${API_KEY}`;
        const response = await axios.get(googleUrl);

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const top5 = response.data.results.slice(0, 5);
          rawHospitals = await Promise.all(top5.map(async (place) => {
            try {
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number&key=${API_KEY}`;
              const detailsRes = await axios.get(detailsUrl);
              return {
                name: place.name,
                address: place.vicinity,
                location: place.geometry.location,
                phone: detailsRes.data.result?.formatted_phone_number || null
              };
            } catch {
              return {
                name: place.name,
                address: place.vicinity,
                location: place.geometry.location,
                phone: null
              };
            }
          }));
          source = 'google_legacy';
        }
      } catch (err) {
        console.error(`[ERROR] Google API Legacy Flow Failed:`, err.message);
      }
    }
  }

  // 2. Fallback to OpenStreetMap (Overpass API)
  if (rawHospitals.length === 0 && userLat !== null && userLng !== null) {
    try {
      console.log(`[DEBUG] Falling back to OpenStreetMap Overpass API...`);
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:10000,${userLat},${userLng})["amenity"="hospital"];out;`;
      const response = await axios.get(overpassUrl, { 
        timeout: 8000,
        headers: {
          'User-Agent': 'LifeSensorX-Emergency-App/1.0'
        }
      });

      if (response.data && response.data.elements && response.data.elements.length > 0) {
        rawHospitals = response.data.elements.map(place => ({
          name: place.tags.name || "Nearby Medical Center",
          address: place.tags["addr:full"] || place.tags["addr:street"] || "Emergency Services",
          location: { lat: place.lat, lng: place.lon },
          phone: place.tags.phone || place.tags["contact:phone"] || null
        })).slice(0, 5);
        source = 'openstreetmap';
      }
    } catch (err) {
      console.error(`[ERROR] OSM API Failed:`, err.message);
    }
  }

  // 3. Fallback: Local Database Hospitals & Mock Data
  if (rawHospitals.length === 0) {
    source = 'in_memory_db';
    rawHospitals = hospitals.map(h => ({
      name: h.name,
      address: h.address,
      location: h.location,
      phone: h.phone,
      beds: h.beds,
      doctorsAvailable: h.doctorsAvailable,
      emergencySupport: h.emergencySupport
    }));
  }

  // Merge registered hospital capacity metrics if matched by proximity or name
  const enrichedHospitals = rawHospitals.map(hosp => {
    const matched = hospitals.find(h => 
      h.name.toLowerCase().includes(hosp.name.toLowerCase()) || 
      (hosp.location && Math.abs(h.location.lat - hosp.location.lat) < 0.01 && Math.abs(h.location.lng - hosp.location.lng) < 0.01)
    );

    if (matched) {
      return {
        ...hosp,
        beds: matched.beds,
        doctorsAvailable: matched.doctorsAvailable,
        emergencySupport: matched.emergencySupport,
        waitingPatients: patients.filter(p => p.hospitalId === matched._id && p.status === 'WAITING').length
      };
    }

    return {
      ...hosp,
      beds: hosp.beds || { total: 50, occupied: 20, available: 30, icu: { total: 10, occupied: 6, available: 4 }, emergency: { total: 8, occupied: 4, available: 4 } },
      doctorsAvailable: hosp.doctorsAvailable || 5,
      emergencySupport: true,
      waitingPatients: 2
    };
  });

  // 4. Apply Explainable AI Recommendation Scoring & Ranking
  const scoredResults = scoreAndRankHospitals(enrichedHospitals, userLat, userLng, 'CRITICAL');

  return res.status(200).json({
    success: true,
    source,
    results: scoredResults
  });
});

/**
 * API Endpoint: /api/recommend-hospital
 * Purpose: Evaluates best hospital for emergency dispatch using rule-based AI engine
 */
app.get('/api/recommend-hospital', (req, res) => {
  const { lat, lng, severity } = req.query;
  const userLat = lat ? parseFloat(lat) : null;
  const userLng = lng ? parseFloat(lng) : null;

  if (userLat === null || userLng === null || isNaN(userLat) || isNaN(userLng)) {
    return res.status(400).json({ success: false, error: "Valid latitude and longitude are required." });
  }

  const enrichedHospitals = hospitals.map(h => ({
    _id: h._id,
    name: h.name,
    address: h.address,
    location: h.location,
    phone: h.phone,
    beds: h.beds,
    doctorsAvailable: h.doctorsAvailable,
    emergencySupport: h.emergencySupport,
    waitingPatients: patients.filter(p => p.hospitalId === h._id && p.status === 'WAITING').length
  }));

  const ranked = scoreAndRankHospitals(enrichedHospitals, userLat, userLng, severity || 'CRITICAL');
  const bestHospital = ranked[0] || null;

  if (!bestHospital) {
    return res.status(404).json({ success: false, error: "No suitable hospital found." });
  }

  res.json({
    success: true,
    recommendedHospital: bestHospital.name,
    score: bestHospital.score,
    reason: bestHospital.reason,
    hospital: bestHospital
  });
});

/**
 * HOSPITAL MANAGEMENT API ENDPOINTS (IN-MEMORY & REAL-TIME)
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
    
    if (!hospital) {
      return res.status(404).json({ success: false, error: "Hospital not found" });
    }

    let target = null;
    if (type === 'icu') target = hospital.beds.icu;
    else if (type === 'emergency') target = hospital.beds.emergency;
    else target = hospital.beds; // 'general'

    if (!target) return res.status(400).json({ success: false, error: 'Invalid bed type' });

    if (action === 'allocate' && target.available > 0) {
      target.occupied++;
      target.available--;
    } else if (action === 'free' && target.occupied > 0) {
      target.occupied--;
      target.available++;
    }

    // Synchronize overall total bed availability
    const generalOccupied = hospital.beds.occupied || 0;
    hospital.beds.available = Math.max(0, hospital.beds.total - generalOccupied);

    io.emit('hospitalUpdate', { hospitalId: hospital._id, beds: hospital.beds });
    res.json({ success: true, data: hospital.beds });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Create a new hospital (for testing/registration)
app.post('/api/hospitals', (req, res) => {
  const newHospital = {
    _id: "hosp_" + Date.now(),
    name: req.body.name || "New Medical Center",
    address: req.body.address || "Medical Zone",
    location: req.body.location || { lat: 28.6139, lng: 77.2090 },
    beds: req.body.beds || { total: 50, occupied: 20, available: 30, icu: { total: 10, occupied: 5, available: 5 }, emergency: { total: 10, occupied: 4, available: 6 } },
    doctorsAvailable: req.body.doctorsAvailable || 4,
    emergencySupport: req.body.emergencySupport !== undefined ? req.body.emergencySupport : true,
    phone: req.body.phone || "+91 9999999999",
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
    
    // Predict Wait Time based on doctors and triage priority
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
    
    // Emit real-time update to all connected hospital dashboards
    io.emit('queueUpdate', { action: 'add', data: newPatient });
    
    res.status(201).json({ success: true, data: newPatient });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. Update Patient Status (e.g., ADMITTED, DISCHARGED)
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
  res.json({
    status: "online",
    message: "LifeSensorX Emergency API is running...",
    timestamp: new Date().toISOString()
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Emergency Backend running on port ${PORT}`);
  console.log(`🔗 Fast2SMS & AI Hospital Scoring active.`);
});
