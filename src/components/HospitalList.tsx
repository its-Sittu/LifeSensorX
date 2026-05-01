import React, { useEffect, useState } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { fetchNearbyHospitals } from '../utils/api';
import { HeartPulse, Navigation, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HospitalList: React.FC = () => {
  const { isEmergencyMode, location, hospitals, setHospitals } = useEmergencyStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getHospitals = async () => {
      if (isEmergencyMode && location.latitude && location.longitude) {
        try {
          setIsLoading(true);
          setError(null);
          const data = await fetchNearbyHospitals(location.latitude, location.longitude);
          setHospitals(data);
        } catch (err: any) {
          setError(err.message || "Failed to load hospitals");
        } finally {
          setIsLoading(false);
        }
      }
    };

    getHospitals();
  }, [isEmergencyMode, location.latitude, location.longitude, setHospitals]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Nearby Hospitals</h3>
        {isLoading ? (
          <Loader2 size={18} className="text-blue-400 animate-spin" />
        ) : (
          <HeartPulse size={18} className={isEmergencyMode ? "text-red-400 animate-pulse" : "text-zinc-500"} />
        )}
      </div>

      <div className="flex flex-col gap-2 min-h-[100px]">
        <AnimatePresence mode="popLayout">
          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20"
            >
              {error}
            </motion.p>
          )}

          {!isLoading && hospitals.length === 0 && !error && (
            <p className="text-sm text-zinc-500 italic p-4 text-center glass-card border-dashed">
              {isEmergencyMode ? "Searching for nearby emergency centers..." : "Hospitals will appear here during emergency."}
            </p>
          )}

          {hospitals.slice(0, 8).map((hospital, index) => (
            <motion.div 
              key={hospital.name + index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex-1 mr-4">
                <p className="text-sm font-medium text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">{hospital.name}</p>
                <p className="text-[10px] text-zinc-500 line-clamp-1 uppercase tracking-wider">{hospital.address}</p>
              </div>
              
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospital.location.lat},${hospital.location.lng}`, '_blank')}
                className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all active:scale-90"
                title="Navigate"
              >
                <Navigation size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HospitalList;
