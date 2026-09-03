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

// In-Memory IoT Hardware Device Tracker
const activeDevices = new Map();
const CRASH_DEBOUNCE_MS = 10000; // 10s cooldown per device to prevent accident duplicate storm

// Socket.io Connection
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Send current IoT device status on connection
  const deviceList = Array.from(activeDevices.values());
  socket.emit('deviceStatusInitial', deviceList);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

/**
 * API Endpoint: POST /api/device/crash
 * Purpose: Receives telemetry and crash events from ESP32 + MPU6050/MPU6500 IoT hardware
 */
app.post('/api/device/crash', (req, res) => {
  try {
    const { 
      deviceId, 
      acceleration, 
      gyroscope, 
      magnitude,
      ax, ay, az, 
      gx, gy, gz,
      crashDetected, 
      crash,
      timestamp 
    } = req.body;

    console.log(`[ESP32] Request received at /api/device/crash:`, req.body);

    // 1. Device Authentication / API Key check (if configured)
    const configuredApiKey = process.env.DEVICE_API_KEY;
    const incomingApiKey = req.headers['x-device-api-key'] || req.headers['authorization'];
    if (configuredApiKey && incomingApiKey !== configuredApiKey) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid or missing x-device-api-key" });
    }

    // 2. Validate deviceId
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Validation failed: 'deviceId' is required." });
    }

    const cleanDeviceId = deviceId.trim();

    // 3. Extract and Validate Acceleration Data
    const accX = Number(acceleration?.x ?? ax ?? 0);
    const accY = Number(acceleration?.y ?? ay ?? 0);
    const accZ = Number(acceleration?.z ?? az ?? 0);

    if (isNaN(accX) || isNaN(accY) || isNaN(accZ)) {
      return res.status(400).json({ success: false, error: "Validation failed: Acceleration (x, y, z) must be valid numbers." });
    }

    // 4. Extract and Validate Gyroscope Data
    const gyroX = Number(gyroscope?.x ?? gx ?? 0);
    const gyroY = Number(gyroscope?.y ?? gy ?? 0);
    const gyroZ = Number(gyroscope?.z ?? gz ?? 0);

    if (isNaN(gyroX) || isNaN(gyroY) || isNaN(gyroZ)) {
      return res.status(400).json({ success: false, error: "Validation failed: Gyroscope (x, y, z) must be valid numbers." });
    }

    // 5. Parse crash detection boolean & magnitude
    const isCrash = Boolean(crashDetected === true || crashDetected === 'true' || crash === true || crash === 'true');
    const calculatedMag = parseFloat(Math.sqrt(accX * accX + accY * accY + accZ * accZ).toFixed(3));
    const finalMagnitude = magnitude !== undefined && !isNaN(Number(magnitude)) ? Number(magnitude) : calculatedMag;
    const eventTime = timestamp ? new Date(timestamp).getTime() || Date.now() : Date.now();

    const existingDevice = activeDevices.get(cleanDeviceId) || {
      deviceId: cleanDeviceId,
      firstSeen: new Date(eventTime).toISOString(),
      crashCount: 0,
      lastCrashTime: 0
    };

    const telemetry = {
      acceleration: { x: accX, y: accY, z: accZ },
      gyroscope: { x: gyroX, y: gyroY, z: gyroZ },
      magnitude: finalMagnitude
    };

    const now = Date.now();

    // 6. Handle Crash Detected Event
    if (isCrash) {
      console.log(`[ESP32] Crash received from ${cleanDeviceId} (Magnitude: ${finalMagnitude})`);

      // Duplicate-Event / Debounce Protection (10-second cooldown per device)
      if (now - existingDevice.lastCrashTime < CRASH_DEBOUNCE_MS) {
        console.warn(`[IOT] Duplicate crash event suppressed for device ${cleanDeviceId} within debounce window.`);
        return res.status(200).json({
          success: true,
          message: "Duplicate crash event suppressed within cooldown period",
          deviceId: cleanDeviceId,
          debounced: true,
          timestamp: eventTime
        });
      }

      existingDevice.lastCrashTime = now;
      existingDevice.crashCount = (existingDevice.crashCount || 0) + 1;
      existingDevice.lastSeen = new Date(now).toISOString();
      existingDevice.telemetry = telemetry;
      existingDevice.status = 'CRASH_ALERT';

      activeDevices.set(cleanDeviceId, existingDevice);

      const crashPayload = {
        source: 'ESP32_HARDWARE',
        deviceId: cleanDeviceId,
        acceleration: { x: accX, y: accY, z: accZ },
        gyroscope: { x: gyroX, y: gyroY, z: gyroZ },
        magnitude: finalMagnitude,
        crashDetected: true,
        timestamp: eventTime
      };

      // Broadcast crash event to React frontend over Socket.io
      console.log(`[Socket.io] Emitting crashDetected:`, crashPayload);
      io.emit('crashDetected', crashPayload);

      // Also update device status
      io.emit('deviceStatusUpdate', {
        deviceId: cleanDeviceId,
        status: 'CRASH_ALERT',
        lastSeen: existingDevice.lastSeen,
        telemetry
      });

      return res.status(200).json({
        success: true,
        message: "Crash event received and forwarded to emergency notification system",
        deviceId: cleanDeviceId,
        timestamp: eventTime,
        magnitude: finalMagnitude,
        emergencyTriggered: true
      });
    }

    // 7. Regular Telemetry / Heartbeat Update (crashDetected === false)
    existingDevice.lastSeen = new Date(now).toISOString();
    existingDevice.telemetry = telemetry;
    existingDevice.status = 'ONLINE';

    activeDevices.set(cleanDeviceId, existingDevice);

    io.emit('deviceStatusUpdate', {
      deviceId: cleanDeviceId,
      status: 'ONLINE',
      lastSeen: existingDevice.lastSeen,
      telemetry
    });

    return res.status(200).json({
      success: true,
      message: "Telemetry heartbeat processed successfully",
      deviceId: cleanDeviceId,
      timestamp: eventTime,
      status: "ONLINE"
    });

  } catch (error) {
    console.error("[ERROR] IoT Device Crash Endpoint Failure:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error processing device telemetry",
      detail: error.message
    });
  }
});

/**
 * API Endpoint: GET /api/device/status
 * Purpose: Returns connected IoT devices and their latest sensor telemetry
 */
app.get('/api/device/status', (req, res) => {
  const { deviceId } = req.query;
  const now = Date.now();

  if (deviceId) {
    const device = activeDevices.get(String(deviceId));
    if (!device) {
      return res.status(404).json({ success: false, error: `Device '${deviceId}' not found or has not reported yet.` });
    }
    const isOnline = (now - new Date(device.lastSeen).getTime()) < 60000;
    return res.json({
      success: true,
      device: {
        ...device,
        isOnline,
        status: isOnline ? device.status : 'OFFLINE'
      }
    });
  }

  const allDevices = Array.from(activeDevices.values()).map(dev => {
    const isOnline = (now - new Date(dev.lastSeen).getTime()) < 60000;
    return {
      ...dev,
      isOnline,
      status: isOnline ? dev.status : 'OFFLINE'
    };
  });

  return res.json({
    success: true,
    totalDevices: allDevices.length,
    devices: allDevices
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

    // 2. Format Phone Numbers (Extract last 10 digits for Indian mobile numbers)
    const formattedNumbers = contacts.map(num => {
      let clean = String(num).replace(/\D/g, '');
      if (clean.length >= 10) {
        return clean.slice(-10); // Guaranteed valid 10-digit mobile number
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

  // 2. Comprehensive OpenStreetMap Real Hospital Discovery (Overpass API - nodes, ways & relations)
  if (rawHospitals.length === 0 && userLat !== null && userLng !== null) {
    try {
      console.log(`[DEBUG] Querying OpenStreetMap Overpass for REAL hospitals near ${userLat}, ${userLng}...`);
      const overpassQuery = `[out:json][timeout:12];
(
  nwr(around:20000,${userLat},${userLng})["amenity"="hospital"];
  nwr(around:20000,${userLat},${userLng})["healthcare"="hospital"];
  nwr(around:15000,${userLat},${userLng})["emergency"="yes"];
  nwr(around:10000,${userLat},${userLng})["amenity"="clinic"];
);
out center 15;`;

      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      const response = await axios.get(overpassUrl, { 
        timeout: 9000,
        headers: {
          'User-Agent': 'LifeSensorX-RealHospitalDiscovery/2.0'
        }
      });

      if (response.data && response.data.elements && response.data.elements.length > 0) {
        // Filter out elements without recognizable names and deduplicate
        const seenNames = new Set();
        const validElements = response.data.elements.filter(el => {
          const name = el.tags?.name || el.tags?.['name:en'] || el.tags?.['official_name'];
          if (!name || seenNames.has(name.toLowerCase())) return false;
          seenNames.add(name.toLowerCase());
          return true;
        });

        if (validElements.length > 0) {
          rawHospitals = validElements.slice(0, 10).map(place => {
            const hLat = place.lat || place.center?.lat;
            const hLng = place.lon || place.center?.lon;
            const street = place.tags?.['addr:street'] || place.tags?.['addr:suburb'] || place.tags?.['addr:district'] || '';
            const city = place.tags?.['addr:city'] || place.tags?.['addr:state'] || '';
            const fullAddr = place.tags?.['addr:full'] || [street, city].filter(Boolean).join(', ') || 'Emergency Trauma & Care Center';

            return {
              name: place.tags.name || place.tags['name:en'] || "Government Medical Center",
              address: fullAddr,
              location: { lat: hLat, lng: hLng },
              phone: place.tags.phone || place.tags["contact:phone"] || place.tags["emergency:phone"] || "+91-112"
            };
          });
          source = 'openstreetmap_overpass';
        }
      }
    } catch (err) {
      console.log(`[DEBUG] OSM Overpass API error:`, err.message);
    }
  }

  // 3. Fallback: OpenStreetMap Nominatim Live Search (100% Free, Global, Real Data)
  if (rawHospitals.length === 0) {
    try {
      console.log(`[DEBUG] Querying OpenStreetMap Nominatim for real hospitals...`);
      let nominatimUrl = '';
      if (userLat !== null && userLng !== null) {
        const delta = 0.25; // ~25km bounding box
        const viewbox = `${userLng - delta},${userLat + delta},${userLng + delta},${userLat - delta}`;
        nominatimUrl = `https://nominatim.openstreetmap.org/search?q=hospital&format=json&viewbox=${viewbox}&bounded=1&limit=10&addressdetails=1`;
      } else if (query) {
        nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' hospital')}&format=json&limit=10&addressdetails=1`;
      }

      if (nominatimUrl) {
        const nomRes = await axios.get(nominatimUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'LifeSensorX-RealHospitalDiscovery/2.0'
          }
        });

        if (nomRes.data && nomRes.data.length > 0) {
          rawHospitals = nomRes.data.map(item => ({
            name: item.name || item.display_name.split(',')[0] || "Hospital",
            address: item.display_name,
            location: {
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon)
            },
            phone: "+91-112"
          })).slice(0, 8);
          source = 'openstreetmap_nominatim';
        }
      }
    } catch (nomErr) {
      console.log(`[DEBUG] Nominatim API error:`, nomErr.message);
    }
  }

  // 4. Fallback: Local Registered Hospitals
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
