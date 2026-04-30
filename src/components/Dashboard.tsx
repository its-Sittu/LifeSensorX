import React from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { ShieldAlert, Activity, Navigation2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCrashDetection } from '../hooks/useCrashDetection';

const Dashboard: React.FC = () => {
  const triggerEmergency = useEmergencyStore(state => state.triggerEmergency);
  const location = useEmergencyStore(state => state.location);
  const { isActive, setIsActive } = useCrashDetection();

  return (
    <div className="flex flex-col gap-6">
      {/* Main Status Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card relative overflow-hidden p-6"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShieldAlert size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              {isActive ? 'System Active' : 'System Standby'}
            </span>
          </div>
          
          <h2 className="text-3xl font-semibold text-white mb-6">
            Monitoring Environment
          </h2>

          <div className="flex items-center justify-between">
            <button 
              onClick={() => setIsActive(!isActive)}
              className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                isActive 
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              }`}
            >
              {isActive ? 'Disable Sensor' : 'Enable Sensor'}
            </button>
            
            <button 
              onClick={triggerEmergency}
              className="px-6 py-2.5 bg-red-500/20 text-red-400 rounded-full font-medium hover:bg-red-500/30 transition-all border border-red-500/30"
            >
              Test Emergency
            </button>
          </div>
        </div>
      </motion.div>

      {/* Location Status (Removed as it's now in LocationMap) */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-400">
          <Activity size={16} className="text-blue-400" />
          <span className="text-xs uppercase tracking-wider font-semibold">Sensor Data</span>
        </div>
        <p className="text-sm font-medium text-zinc-300">
          {isActive ? 'Calibrating...' : 'Offline'}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
