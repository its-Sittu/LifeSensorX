import React, { useState, useEffect } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { ShieldAlert, Activity, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCrashDetection } from '../hooks/useCrashDetection';
import { useHospitalSocket } from '../hooks/useHospitalSocket';

interface DeviceData {
  deviceId: string;
  status: string;
  lastSeen?: string;
  telemetry?: {
    acceleration?: { x: number; y: number; z: number };
    gyroscope?: { x: number; y: number; z: number };
    impactMagnitude?: number;
  };
}

const Dashboard: React.FC = () => {
  const triggerEmergency = useEmergencyStore(state => state.triggerEmergency);
  const { isActive, setIsActive } = useCrashDetection();
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
            <div className={`w-3 h-3 rounded-full ${isActive || isIotOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              {isActive || isIotOnline ? 'System Active' : 'System Standby'}
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
              {isActive ? 'Disable Phone Sensor' : 'Enable Phone Sensor'}
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

      {/* Sensor Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phone Motion Sensor */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Activity size={16} className="text-blue-400" />
            <span className="text-xs uppercase tracking-wider font-semibold">Phone Motion</span>
          </div>
          <p className="text-sm font-medium text-zinc-300">
            {isActive ? 'Active (Monitoring)' : 'Offline'}
          </p>
        </div>

        {/* ESP32 / MPU6050 IoT Hardware Status */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Cpu size={16} className={isIotOnline ? "text-emerald-400" : "text-amber-400"} />
            <span className="text-xs uppercase tracking-wider font-semibold">ESP32 Hardware</span>
          </div>
          <p className="text-sm font-medium text-zinc-300">
            {isIotOnline 
              ? `${iotDevice?.deviceId || 'Online'} • Impact: ${iotDevice?.telemetry?.impactMagnitude ?? 0}`
              : 'Standby (Awaiting ESP32)'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

