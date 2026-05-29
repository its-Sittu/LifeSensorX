# 🚨 LifeSensorX — Advanced Accident Detection & Smart Emergency Responder

[![React](https://img.shields.io/badge/React-19.2-blue?logo=react&logoColor=white&style=flat-square)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-black?logo=socket.io&logoColor=white&style=flat-square)](https://socket.io)
[![Google Places API](https://img.shields.io/badge/Google_Maps-Places_API-4285F4?logo=google-maps&logoColor=white&style=flat-square)](https://developers.google.com/maps)

**LifeSensorX** is an enterprise-grade, high-performance web ecosystem designed for **real-time vehicular accident detection, automated high-accuracy dispatching, and dynamic emergency hospital routing**. 

Integrating mobile device telematics, geolocation tracking, a multi-tier resilient medical lookup engine, and instant WebSocket-driven triage queue management, LifeSensorX ensures that medical assistance is summoned and routed, even if the victim is incapacitated.

---

## 🌟 Visual Workflow & Architecture

```mermaid
flowchart TD
    subgraph Client Application (React/Zustand)
        A[Start Monitoring] --> B[Device Motion Sensor Check]
        B -- Collision Impact Triggered --> C[Play Loud Alarm + Vibrate]
        C --> D[10-Second Fail-Safe Countdown]
        
        D -- User Dismisses ("I'm Safe") --> A
        
        D -- Countdown Expiry --> E[Acquire High-Accuracy GPS Coordinates]
        E --> F[API Request to Backend /send-alert]
        E --> G[Query Resilient Hospital Finder]
    end

    subgraph Backend Server (Node.js/Express/WebSockets)
        F --> H[Format Phone Numbers & Parse SMS Template]
        H --> I[Dispatch Bulk SMS via Fast2SMS Gateway]
        
        G --> J{API Key Active?}
        J -- Yes --> K[Google Places API Search Nearby]
        J -- No/Quota Exceeded --> L[Live OpenStreetMap Overpass API]
        L -- Fails/Timeout --> M[Offline Mock Backup Data]
        
        K & L & M --> N[Send Hospital List to Client]
        E --> O[Add User to Hospital Live Triage Queue]
        O --> P[Emit WebSocket Broadcast to Admin Dashboard]
    end

    subgraph Hospital Portal (Live Triage Panel)
        P --> Q[Instant UI Queue Injection]
        Q --> R[Real-time Bed Allocation & Doctor Updates]
        R --> S[Recalculate Dynamic Waiting Time Predictions]
    end
```

---

## 🚀 Key Features

### 1. 📱 Device Telematics & Crash Detection
* **High-Impact Collision Monitoring**: Utilizes the HTML5 **DeviceMotion API** to sample real-time device accelerometer forces ($G$-forces), listening for severe impact thresholds.
* **Fail-Safe Countdown**: Initiates a high-intensity audio-visual alarm with multi-pattern haptic vibration feedback. A **10-second timer** gives users control to dismiss false alarms (e.g., dropping the phone).

### 2. 📡 Automated Multi-Channel Alerting
* **Instant Background SMS**: Connects with the **Fast2SMS Bulk Gateway** to automatically broadcast the user's precise Google Maps coordinates link to emergency contacts.
* **Resilient Failovers**: If the background network API fails or if no emergency contacts are configured, the frontend gracefully activates local protocol triggers—generating native WhatsApp and SMS app hooks with pre-populated maps links.

### 3. 🏥 Resilient 3-Tier Hospital Search Engine
* **High-Accuracy Search**: Automatically scans a **10 KM radius** around the incident coordinates.
* **Tier 1 (Google Places API - New & Legacy)**: Attempts to grab top-rated local trauma centers complete with addresses, coordinates, and registered phone numbers.
* **Tier 2 (OpenStreetMap Overpass API Fallback)**: If the Google API key runs out of quota or fails, the server instantly falls back to query OpenStreetMap's live nodes. Requires **no API keys** and fetches actual local clinics.
* **Tier 3 (Mock Coordinates)**: In zero-connectivity or local sandbox testing, the backend generates backup coordinates.

### 4. ⚡ Live WebSocket Hospital Administration Portal
* **Real-time Live Triage Queue**: Automatic injection of crash victims into the hospital's live patient table via **Socket.io**.
* **Dynamic Wait Time Estimator**: Predicts consultation waiting times using custom severity and trauma-level weighting algorithms.
* **Interactive Bed Management**: Real-time management and socket broadcasts of available General, Emergency, and ICU beds.
* **Rich Analytics Dashboards**: Interactive charts built with **Recharts** representing occupancy rates, severity breakdowns, and response times.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Framer Motion |
| **State Management** | Zustand (with selective LocalStorage persistence for contacts) |
| **Backend** | Node.js, Express, Socket.io |
| **APIs & Services** | Google Places API (New & Classic), OpenStreetMap Overpass API, Fast2SMS API |
| **Visualization** | Lucide React, Recharts, Mermaid.js |

---

## ⚙️ Project Setup & Installation

### Prerequisites
* **Node.js** (v18.x or above)
* **npm** (v9.x or above)

### 1. Clone & Install Root Dependencies
```bash
git clone https://github.com/its-Sittu/LifeSensorX.git
cd LifeSensorX
npm install
```

### 2. Configure Environment Variables
Create a `.env` file inside the `server` directory:
```bash
cd server
touch .env
```
Add the following configuration parameters:
```env
PORT=5000
FAST2SMS_API_KEY=your_fast2sms_api_key_here
GOOGLE_MAPS_API_KEY=your_google_places_api_key_here
```

### 3. Run the Backend Server
```bash
node index.js
```
*Expect to see:* `🚀 Emergency Backend running on port 5000`

### 4. Run the Frontend Development Server
Open a new terminal at the project root and run:
```bash
npm run dev
```
*Expect to see:* `➜  Local:   https://localhost:5173/`

> **Note on HTTPS/SSL**: The browser's **DeviceMotion API** and high-accuracy Geolocation tracking require a **secure context (HTTPS)**. The frontend uses `vite-plugin-mkcert` to automatically generate local developer certificates. If your browser displays a warning, click *Advanced -> Proceed to localhost*.

---

## 🔌 API Endpoint Documentation

### 1. Dispatch Emergency SMS
* **Endpoint:** `POST /send-alert`
* **Content-Type:** `application/json`
* **Request Payload:**
  ```json
  {
    "contacts": ["+919876543210"],
    "latitude": 28.6139,
    "longitude": 77.2090
  }
  ```
* **Response (Success):**
  ```json
  {
    "success": true,
    "message": "Emergency SMS sent successfully",
    "request_id": "req_8372648"
  }
  ```

### 2. Search Nearby Hospitals
* **Endpoint:** `GET /nearby-hospitals`
* **Query Parameters:** `lat` (latitude), `lng` (longitude), `query` (optional manual search query)
* **Response (Success - Google Places Fallback):**
  ```json
  {
    "success": true,
    "source": "google_new",
    "results": [
      {
        "name": "Max Super Speciality Hospital, Saket",
        "address": "1 2, Press Enclave Marg, Saket, New Delhi",
        "location": { "lat": 28.5275, "lng": 77.2119 },
        "phone": "+91 11 2651 5050"
      }
    ]
  }
  ```

### 3. Retrieve Live Hospital Statuses
* **Endpoint:** `GET /api/hospitals`
* **Response (Success):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "hosp_1",
        "name": "Central General Hospital",
        "beds": {
          "total": 100, "occupied": 50, "available": 50,
          "icu": { "total": 20, "occupied": 15, "available": 5 },
          "emergency": { "total": 10, "occupied": 8, "available": 2 }
        },
        "doctorsAvailable": 5,
        "emergencySupport": true
      }
    ]
  }
  ```

---

## 🔒 Security & Offline Considerations
* **Local Storage Sandbox**: Emergency contacts are saved locally on the client's device sandbox and never harvested or saved on servers.
* **Network Independence**: The hospital search and location detection flows run in a non-blocking architecture, meaning an SMS dispatch gateway timeout will **never** stop nearby medical routing.
* **Self-Healing WebSockets**: The dashboard queue recovers and reconnects automatically in the event of minor internet dropouts.

---

## 📱 Mobile Compatibility & Testing
1. Connect your computer and mobile phone to the same local Wi-Fi network.
2. In the terminal running Vite, copy the `Network:` IP address (e.g. `https://192.168.1.15:5173`).
3. Open this link on your phone's browser, grant location and accelerometer access, and shake the phone to test the crash impact alert!

---

Developed with ❤️ for human safety by [Sittu](https://github.com/its-Sittu)
