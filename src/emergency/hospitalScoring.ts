/**
 * hospitalScoring.ts
 * Scores and selects the best hospital from a list based on distance, available beds, waiting patients, and facilities.
 */

export interface Hospital {
  _id?: string;
  id?: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  availableBeds?: number;
  waitingPatients?: number;
  hasICU?: boolean;
  hasTraumaUnit?: boolean;
  distance?: number; // In km
}

export function scoreAndSelectBestHospital(hospitals: Hospital[], severity: string): Hospital | null {
  if (!hospitals || hospitals.length === 0) return null;

  let bestHospital: Hospital | null = null;
  let highestScore = -Infinity;

  hospitals.forEach(hospital => {
    let score = 0;

    // 1. Distance (40% weight). Closer = higher score. Max 10km threshold.
    const distanceKm = hospital.distance || 0;
    const distanceScore = Math.max(0, ((10 - distanceKm) / 10) * 40);
    score += distanceScore;

    // 2. Available beds (25% weight). 
    // Assuming max beds threshold for full score is 50.
    const availableBeds = hospital.availableBeds || 0;
    const bedScore = Math.min(availableBeds / 50, 1) * 25;
    score += bedScore;

    // 3. Waiting patients (20% weight). Fewer = higher score.
    // Assuming max waiting is 20 for zero score.
    const waitingPatients = hospital.waitingPatients || 0;
    const waitingScore = Math.max(0, ((20 - waitingPatients) / 20) * 20);
    score += waitingScore;

    // 4. ICU (15 bonus points if severity is HIGH)
    if (severity === 'HIGH' && hospital.hasICU) {
      score += 15;
    }

    // 5. Trauma unit (10 bonus points)
    if (hospital.hasTraumaUnit) {
      score += 10;
    }

    if (score > highestScore) {
      highestScore = score;
      bestHospital = hospital;
    }
  });

  return bestHospital;
}

/**
 * Haversine formula to calculate distance in km between two coordinates.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;  
  const dLon = (lon2 - lon1) * Math.PI / 180; 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return d;
}
