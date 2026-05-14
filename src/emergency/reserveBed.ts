/**
 * Reserves a bed for the emergency case and creates an EmergencyCase document.
 */
import mongoose from 'mongoose';

const Bed = mongoose.models.Bed || mongoose.model('Bed', new mongoose.Schema({
  hospitalId: String, status: String, type: String
}));

const EmergencyCase = mongoose.models.EmergencyCase || mongoose.model('EmergencyCase', new mongoose.Schema({
  patientId: String, hospitalId: String, bedId: String, ambulanceId: String,
  status: String, severity: String, location: Object, triggeredAt: Date
}));

export async function reserveBed(
  patientId: string,
  hospitalId: string,
  lat: number,
  lng: number
): Promise<{ bedId: string, caseId: string, bedNumber: string }> {
  try {
    // 1. Find an available bed
    const availableBed = await Bed.findOne({ hospitalId: hospitalId, status: 'AVAILABLE' });
    
    let bedId = 'UNKNOWN_BED';
    let bedNumber = 'General';

    if (availableBed) {
      availableBed.status = 'reserved';
      await availableBed.save();
      bedId = availableBed._id.toString();
      bedNumber = availableBed.type || 'General';
      console.log(`[${new Date().toISOString()}] Bed ${bedId} reserved.`);
    } else {
      console.log(`[${new Date().toISOString()}] No available beds found, proceeding with fallback bed allocation.`);
    }

    // 2. Create EmergencyCase
    const newCase = new EmergencyCase({
      patientId,
      hospitalId,
      bedId,
      status: 'DISPATCHED',
      severity: 'HIGH',
      location: { lat, lng },
      triggeredAt: Date.now()
    });

    const savedCase = await newCase.save();

    console.log(`[${new Date().toISOString()}] EmergencyCase created: ${savedCase._id}`);
    
    return {
      bedId,
      caseId: savedCase._id.toString(),
      bedNumber
    };

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Failed to reserve bed:`, error.message);
    throw error;
  }
}
