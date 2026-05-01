import React, { useEffect, useState } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { fetchNearbyHospitals } from '../utils/api';
import { HeartPulse, Navigation, Loader2, Phone, MapPin } from 'lucide-react';
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
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          Nearby Hospitals
          {isEmergencyMode && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        </h3>
        {isLoading && <Loader2 size={18} className="text-blue-400 animate-spin" />}
      </div>

      <div className="flex flex-col gap-3 min-h-[100px]">
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
            <div className="p-8 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center gap-2">
              <HeartPulse size={24} className="text-zinc-700" />
              <p className="text-sm text-zinc-500 text-center">
                {isEmergencyMode ? "Scanning for medical help..." : "Hospitals will appear here during emergency."}
              </p>
            </div>
          )}

          {hospitals.slice(0, 5).map((hospital, index) => (
            <motion.div 
              key={hospital.name + index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card p-4 hover:bg-zinc-800/40 transition-all border border-zinc-800/50"
            >
              <div className="flex flex-col gap-3">
                <div>
                  <h4 className="text-white font-bold text-sm leading-tight">{hospital.name}</h4>
                  <p className="text-zinc-500 text-[11px] mt-1 flex items-start gap-1">
                    <MapPin size={12} className="shrink-0 mt-0.5" />
                    {hospital.address}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {hospital.phone ? (
                    <a 
                      href={`tel:${hospital.phone.replace(/\s+/g, '')}`}
                      className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
                    >
                      <Phone size={14} />
                      Call Now
                    </a>
                  ) : (
                    <div className="flex-1 py-2 rounded-lg bg-zinc-800/50 text-zinc-500 text-[10px] font-medium flex items-center justify-center italic">
                      Phone Unavailable
                    </div>
                  )}
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospital.location.lat},${hospital.location.lng}`, '_blank')}
                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all active:scale-95 shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                  >
                    <Navigation size={14} />
                    Directions
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HospitalList;
