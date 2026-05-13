/**
 * Calculate the estimated wait time for a new patient based on the current queue.
 * Simple algorithm:
 * - Base consultation time: 15 mins.
 * - Critical/High patients jump the queue.
 * - Wait time = (Number of patients ahead / Available doctors) * 15 mins.
 * 
 * @param {Array} currentQueue - List of waiting patients
 * @param {Object} newPatient - The new patient being added
 * @param {Number} availableDoctors - Number of available doctors
 * @returns {Number} - Estimated wait time in minutes
 */
const calculateWaitTime = (currentQueue, newPatient, availableDoctors) => {
  const BASE_CONSULT_TIME = 15; // minutes
  const docs = availableDoctors > 0 ? availableDoctors : 1;

  // Filter out patients who are not waiting
  const waitingPatients = currentQueue.filter(p => p.status === 'WAITING');

  // Severity weights for sorting (higher is more critical)
  const severityWeight = {
    'CRITICAL': 4,
    'HIGH': 3,
    'MEDIUM': 2,
    'LOW': 1
  };

  // If the new patient is CRITICAL, they bypass almost everyone
  // Let's count how many patients have >= severity
  let patientsAhead = 0;
  const newPatientWeight = severityWeight[newPatient.severity || 'MEDIUM'];

  for (const patient of waitingPatients) {
    const w = severityWeight[patient.severity || 'MEDIUM'];
    // If waiting patient is more or equally critical, they are ahead.
    // If equally critical, it's FCFS (they arrived earlier, so they are ahead).
    if (w >= newPatientWeight) {
      patientsAhead++;
    }
  }

  // Calculate wait time
  const waitTime = Math.ceil((patientsAhead * BASE_CONSULT_TIME) / docs);
  
  return waitTime;
};

module.exports = {
  calculateWaitTime
};
