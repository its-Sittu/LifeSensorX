const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  total: { type: Number, default: 0 },
  occupied: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  icu: {
    total: { type: Number, default: 0 },
    occupied: { type: Number, default: 0 },
    available: { type: Number, default: 0 }
  },
  emergency: {
    total: { type: Number, default: 0 },
    occupied: { type: Number, default: 0 },
    available: { type: Number, default: 0 }
  }
});

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  contact: { type: String },
  beds: bedSchema,
  doctorsAvailable: { type: Number, default: 0 },
  emergencySupport: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to calculate available beds
hospitalSchema.pre('save', function(next) {
  this.beds.available = this.beds.total - this.beds.occupied;
  this.beds.icu.available = this.beds.icu.total - this.beds.icu.occupied;
  this.beds.emergency.available = this.beds.emergency.total - this.beds.emergency.occupied;
  next();
});

module.exports = mongoose.model('Hospital', hospitalSchema);
