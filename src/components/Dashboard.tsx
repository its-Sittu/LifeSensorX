import React, { useState, useEffect } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { ShieldAlert, Cpu, Radio, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHospitalSocket } from '../hooks/useHospitalSocket';
import { unlockAudio } from '../utils/audioAlarm';

interface DeviceData {
  deviceId: string;
  status: string;
  lastSeen?: string;
  telemetry?: {
    acceleration?: { x: number; y: number; z: number };
    gyroscope?: { x: number; y: number; z: number };
    magnitude?: number;
    impactMagnitude?: number;
  };
}

const Dashboard: React.FC = () => {
  const triggerEmergency = useEmergencyStore(state => state.triggerEmergency);
  const { socket } = useHospitalSocket();
  const [iotDevice, setIotDevice] = useState<DeviceData | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleInitial = (devices: DeviceData[]) => {
      if (devices && devices.length > 0) {
        setIotDevice(devices[devices.length - 1]);
      }
    };

    const handleUpdate = (data: DeviceData) => {
      setIotDevice(data);
    };

    socket.on('deviceStatusInitial', handleInitial);
    socket.on('deviceStatusUpdate', handleUpdate);

    return () => {
      socket.off('deviceStatusInitial', handleInitial);
      socket.off('deviceStatusUpdate', handleUpdate);
    };
  }, [socket]);

  const isIotOnline = iotDevice && iotDevice.status !== 'OFFLINE';
  const currentMagnitude = iotDevice?.telemetry?.magnitude ?? iotDevice?.telemetry?.impactMagnitude ?? 0;

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
            <div className={`w-3 h-3 rounded-full ${isIotOnline ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400 animate-pulse'}`} />
            <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              {isIotOnline ? 'ESP32 Hardware Connected' : 'IoT Crash Monitor Active'}
            </span>
          </div>
          
          <h2 className="text-3xl font-semibold text-white mb-2">
            Accident Protection Active
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Directly linked to ESP32 + MPU6500 hardware. Alarms trigger automatically upon impact.
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800">
              <Radio size={14} className={isIotOnline ? "text-emerald-400 animate-pulse" : "text-cyan-400"} />
              <span>{isIotOnline ? `Device: ${iotDevice?.deviceId}` : 'Awaiting ESP32 Crash Signal'}</span>
            </div>
            
            <button 
              onClick={() => {
                unlockAudio();
                triggerEmergency();
              }}
              className="px-6 py-2.5 bg-red-500/20 text-red-400 rounded-full font-medium hover:bg-red-500/30 transition-all border border-red-500/30"
            >
              Test Emergency
            </button>
          </div>
        </div>
      </motion.div>

      {/* Sensor Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ESP32 / MPU6500 IoT Hardware Status */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Cpu size={16} className={isIotOnline ? "text-emerald-400" : "text-cyan-400"} />
            <span className="text-xs uppercase tracking-wider font-semibold">ESP32 Hardware</span>
          </div>
          <p className="text-sm font-medium text-zinc-300 font-mono">
            {isIotOnline 
              ? `${iotDevice?.deviceId || 'Online'} (${currentMagnitude}g)`
              : 'Standby / Ready'}
          </p>
        </div>

        {/* Emergency System Status */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="text-xs uppercase tracking-wider font-semibold">Automatic Dispatch</span>
          </div>
          <p className="text-sm font-medium text-emerald-400 font-mono">
            Direct Siren & SMS Armed
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


