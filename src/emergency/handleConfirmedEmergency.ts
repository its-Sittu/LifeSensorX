/**
 * Main orchestrator function for the Automatic Emergency Notification System.
 * Runs after the 10-second confirmation timer expires.
 */
import axios from 'axios';
import mongoose from 'mongoose';
import { getHindiAddress } from './geocode';
import { notifyContacts } from './notifyContacts';
import { scoreAndSelectBestHospital, calculateDistance, Hospital as ScoredHospital } from './hospitalScoring';
import { callHospital } from './callHospital';
import { reserveBed } from './reserveBed';
import { Server } from 'socket.io';

// Declare global Socket.io instance access
declare global {
  var io: Server;
}

const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: String, phone: String, emergencyContacts: [{ name: String, phone: String }]
}));

const HospitalModel = mongoose.models.Hospital || mongoose.model('Hospital', new mongoose.Schema({
  name: String, phone: String, lat: Number, lng: Number, 
  availableBeds: Number, waitingPatients: Number, hasICU: Boolean, hasTraumaUnit: Boolean
}));

interface EmergencyEvent {
  userId: string;
  lat: number;
  lng: number;
}

export async function handleConfirmedEmergency({ userId, lat, lng }: EmergencyEvent) {
  console.log(`[${new Date().toISOString()}] Starting handleConfirmedEmergency for user ${userId} at ${lat},${lng}`);
  
  try {
    // Timeout Promise to ensure completion within 15 seconds
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Emergency handling exceeded 15 seconds limit')), 14000)
    );

    const executionPromise = (async () => {
      // Fetch user data
      const user = await User.findById(userId);
      if (!user) throw new Error(`User not found: ${userId}`);
      
      const patientName = user.name || 'Unknown Patient';

      // STEP 1 & 3: Run Google APIs in parallel (Geocoding & Places)
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=hospital&key=${process.env.GOOGLE_MAPS_KEY}`;
      
      const [address, placesResponse] = await Promise.all([
        getHindiAddress(lat, lng),
        axios.get(placesUrl).catch(e => {
          console.error(`[${new Date().toISOString()}] Google Places API failed:`, e.message);
          return { data: { results: [] } };
        })
      ]);

      // Extract up to 5 hospitals from Places API
      const nearbyPlaces = placesResponse.data?.results?.slice(0, 5) || [];
      
      // STEP 2: SMS to Emergency Contacts (fire and forget inside Promise.all later)
      const notifyContactsPromise = notifyContacts(patientName, user.emergencyContacts || [], lat, lng, address);

      // STEP 3 (cont.) & 4: Merge with DB Hospital data and Score
      const dbHospitals = await HospitalModel.find({});
      
      const hospitalsToScore: ScoredHospital[] = nearbyPlaces.map((place: any) => {
        // Try to match place with DB hospital by name or proximity (<1km)
        const matchedDbHospital = dbHospitals.find(dbH => 
          dbH.name.toLowerCase().includes(place.name.toLowerCase()) || 
          calculateDistance(dbH.lat, dbH.lng, place.geometry.location.lat, place.geometry.location.lng) < 1
        );

        return {
          id: matchedDbHospital?._id?.toString() || place.place_id,
          name: place.name,
          phone: matchedDbHospital?.phone || '', 
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          distance: calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng),
          availableBeds: matchedDbHospital?.availableBeds || 0,
          waitingPatients: matchedDbHospital?.waitingPatients || 0,
          hasICU: matchedDbHospital?.hasICU || false,
          hasTraumaUnit: matchedDbHospital?.hasTraumaUnit || false
        };
      });

      const bestHospital = scoreAndSelectBestHospital(hospitalsToScore, 'HIGH');

      if (!bestHospital) {
        throw new Error('No valid hospitals found within range');
      }

      console.log(`[${new Date().toISOString()}] Selected best hospital: ${bestHospital.name}`);

      // STEP 5: Reserve Bed & Create Case
      const { bedId, caseId, bedNumber } = await reserveBed(userId, bestHospital.id!, lat, lng);

      // STEP 6 & 7: Automated Voice Call and SMS to Hospital
      const callHospitalPromise = callHospital(bestHospital.phone, patientName, address, lat, lng);

      // STEP 8: Notify Hospital Dashboard via WebSocket
      const eta = Math.round((bestHospital.distance || 0) * 3); // Rough ETA in mins
      if (global.io) {
        global.io.to(`hospital:${bestHospital.id}`).emit('INCOMING_PATIENT', {
          type: "INCOMING_PATIENT",
          patientName,
          bedNumber,
          eta,
          severity: "HIGH",
          location: { lat, lng },
          caseId
        });
        console.log(`[${new Date().toISOString()}] Dashboard WebSocket event emitted for hospital ${bestHospital.id}`);
      }

      // Wait for parallel non-blocking promises
      await Promise.all([notifyContactsPromise, callHospitalPromise]);

      // STEP 9: Return Response to Frontend
      return {
        success: true,
        hospitalName: bestHospital.name,
        bedNumber,
        ambulanceEta: eta,
        caseId,
        address,
        mapsLink: `https://maps.google.com/?q=${lat},${lng}`
      };
    })();

    const result = await Promise.race([executionPromise, timeoutPromise]);
    console.log(`[${new Date().toISOString()}] Emergency workflow completed successfully`);
    return result;

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Emergency workflow failed:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
