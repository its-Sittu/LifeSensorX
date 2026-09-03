/**
 * Explainable AI Hospital Recommendation Engine for LifeSensorX
 * Evaluates nearby hospitals based on:
 * 1. Distance (Haversine Formula) - 40%
 * 2. Bed & ICU Availability - 25%
 * 3. Queue Load & Waiting Patients - 20%
 * 4. Doctor Availability & Emergency Support - 15%
 */

/**
 * Calculates distance in km between two coordinates using Haversine formula.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 1 decimal place
}

/**
 * Calculates rule-based AI recommendation score and generates an explainable reason.
 * 
 * @param {Object} hospital - Hospital object
 * @param {number|null} userLat - User's latitude
 * @param {number|null} userLng - User's longitude
 * @param {string} severity - 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 * @returns {Object} - { score: number, reason: string, distanceKm: number|null }
 */
function calculateHospitalScore(hospital, userLat, userLng, severity = 'CRITICAL') {
  let score = 0;
  const reasons = [];

  const hospLat = hospital.location?.lat ?? hospital.lat;
  const hospLng = hospital.location?.lng ?? hospital.lng;
  const distanceKm = calculateHaversineDistance(userLat, userLng, hospLat, hospLng);

  // 1. Distance Scoring (Max 40 points)
  if (distanceKm !== null) {
    // Within 2km = 40 pts, decays linearly up to 15km
    const distScore = Math.max(0, Math.min(40, ((15 - distanceKm) / 15) * 40));
    score += distScore;
    if (distanceKm <= 3) {
      reasons.push(`very close (${distanceKm} km)`);
    } else if (distanceKm <= 7) {
      reasons.push(`moderate distance (${distanceKm} km)`);
    } else {
      reasons.push(`${distanceKm} km away`);
    }
  } else {
    score += 20; // Default baseline if distance cannot be computed
  }

  // 2. Bed & ICU Capacity (Max 25 points)
  const beds = hospital.beds || {};
  const icuAvailable = beds.icu?.available ?? (hospital.hasICU ? 4 : 0);
  const emergencyAvailable = beds.emergency?.available ?? (hospital.emergencySupport ? 3 : 0);
  const generalAvailable = beds.available ?? (beds.total ? beds.total - (beds.occupied || 0) : 10);

  let bedScore = 0;
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    // Priority on ICU & Emergency beds
    if (icuAvailable > 0) bedScore += 12;
    if (emergencyAvailable > 0) bedScore += 13;
    if (icuAvailable > 0 && emergencyAvailable > 0) {
      reasons.push(`ICU & emergency beds available`);
    } else if (icuAvailable > 0) {
      reasons.push(`ICU beds ready`);
    }
  } else {
    // Standard capacity
    bedScore = Math.min(25, (generalAvailable / 30) * 25);
    if (generalAvailable > 5) {
      reasons.push(`adequate general bed capacity`);
    }
  }
  score += bedScore;

  // 3. Queue Load & Waiting Time (Max 20 points)
  const waitingPatients = hospital.waitingPatients ?? (hospital.currentQueueLength || 0);
  // Fewer waiting patients = higher score (0 patients = 20 pts, 20+ patients = 0 pts)
  const queueScore = Math.max(0, Math.min(20, ((20 - waitingPatients) / 20) * 20));
  score += queueScore;
  if (waitingPatients <= 2) {
    reasons.push(`minimal triage queue wait time`);
  } else if (waitingPatients <= 5) {
    reasons.push(`low queue load`);
  }

  // 4. Doctor Availability & Emergency Support (Max 15 points)
  const doctors = hospital.doctorsAvailable ?? 5;
  const emergencySupport = hospital.emergencySupport ?? true;

  let facilityScore = 0;
  if (emergencySupport) facilityScore += 8;
  if (doctors >= 4) {
    facilityScore += 7;
    reasons.push(`active emergency staff`);
  } else if (doctors > 0) {
    facilityScore += 4;
  }
  score += facilityScore;

  // Normalize final score between 10 and 100
  const finalScore = Math.min(100, Math.max(10, Math.round(score)));

  // Generate clear reason string
  let reasonString = reasons.length > 0
    ? `Recommended for ${reasons.join(', ')}.`
    : `Optimal emergency readiness and balanced capacity.`;

  return {
    score: finalScore,
    reason: reasonString,
    distanceKm
  };
}

/**
 * Scores and ranks a list of hospitals.
 */
function scoreAndRankHospitals(hospitals, userLat, userLng, severity = 'CRITICAL') {
  if (!hospitals || !Array.isArray(hospitals) || hospitals.length === 0) {
    return [];
  }

  const scoredList = hospitals.map(hospital => {
    const { score, reason, distanceKm } = calculateHospitalScore(hospital, userLat, userLng, severity);
    return {
      ...hospital,
      distanceKm,
      score,
      reason
    };
  });

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  // Mark top hospital as recommended
  if (scoredList.length > 0) {
    scoredList[0].isRecommended = true;
  }

  return scoredList;
}

module.exports = {
  calculateHaversineDistance,
  calculateHospitalScore,
  scoreAndRankHospitals
};
