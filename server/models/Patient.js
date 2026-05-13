const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  name: { type: String, required: true },
  contact: { type: String },
  age: { type: Number },
  gender: { type: String },
  severity: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'MEDIUM' 
  },
  status: {
    type: String,
    enum: ['WAITING', 'IN_CONSULTATION', 'ADMITTED', 'DISCHARGED'],
    default: 'WAITING'
  },
  consultationType: { type: String, default: 'GENERAL' },
  arrivalTime: { type: Date, default: Date.now },
  estimatedWaitTime: { type: Number, default: 0 }, // in minutes
  assignedDoctor: { type: String },
  notes: { type: String }
});

module.exports = mongoose.model('Patient', patientSchema);
