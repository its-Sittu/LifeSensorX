import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '' : 'https://lifesensorx.onrender.com');

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    severity: 'MEDIUM',
    consultationType: 'GENERAL'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/queue`, {
        ...formData,
        age: parseInt(formData.age) || 0
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setFormData({
          name: '',
          age: '',
          gender: 'Male',
          severity: 'MEDIUM',
          consultationType: 'GENERAL'
        });
      }, 1500);
    } catch (err) {
      console.error("Failed to add patient", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Successfully Added!</h2>
            <p className="text-zinc-400">Patient has been pushed to the live queue.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-zinc-900 to-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              <UserPlus size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Manual Entry</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Patient Name</label>
            <input 
              type="text" required
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Age</label>
              <input 
                type="number" required min="0" max="150"
                value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                placeholder="Age"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Gender</label>
              <select 
                value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Severity</label>
              <select 
                value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}
                className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all ${
                  formData.severity === 'CRITICAL' ? 'border-red-500/50 text-red-400' : 
                  formData.severity === 'HIGH' ? 'border-orange-500/50 text-orange-400' : 'border-zinc-800'
                }`}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Department</label>
              <select 
                value={formData.consultationType} onChange={e => setFormData({...formData, consultationType: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              >
                <option value="GENERAL">General</option>
                <option value="CARDIOLOGY">Cardiology</option>
                <option value="ORTHOPEDIC">Orthopedic</option>
                <option value="TRAUMA">Trauma</option>
              </select>
            </div>
          </div>

          {formData.severity === 'CRITICAL' && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-4">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400/90 leading-relaxed">
                Critical patients will bypass the standard queue and be highlighted for immediate attention by the AI system.
              </p>
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding to Queue...' : 'Add Patient to Queue'}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
};

export default AddPatientModal;
