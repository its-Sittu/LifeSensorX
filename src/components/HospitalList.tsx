import React, { useEffect, useState } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { fetchNearbyHospitals } from '../utils/api';
import { HeartPulse, Navigation, Loader2, Phone, MapPin, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
};

const HospitalList: React.FC = () => {
  const { isEmergencyMode, location, hospitals, setHospitals } = useEmergencyStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getHospitals = async (lat: number | null, lng: number | null, query: string | null = null) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchNearbyHospitals(lat, lng, query);
      setHospitals(data);
    } catch (err: any) {
      setError(err.message || "Failed to load hospitals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isEmergencyMode && location.latitude && location.longitude) {
      getHospitals(location.latitude, location.longitude);
    }
  }, [isEmergencyMode, location.latitude, location.longitude, setHospitals]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    getHospitals(null, null, searchQuery.trim());
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          Nearby Hospitals
          {isEmergencyMode && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        </h3>
        {isLoading && <Loader2 size={18} className="text-blue-400 animate-spin" />}
      </div>

      {/* Manual Geolocation Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type city or neighborhood (e.g. Saket, Delhi)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
        <button 
          type="submit"
          disabled={isLoading}
          className="px-4 py-2.5 bg-zinc-800 text-xs font-semibold text-zinc-300 rounded-xl border border-zinc-700 hover:text-white hover:border-cyan-500/50 transition-all active:scale-95 shrink-0 disabled:opacity-50"
        >
          Search
        </button>
      </form>

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

          {hospitals.slice(0, 5).map((hospital, index) => {
            const distance = (location.latitude && location.longitude && hospital.location)
              ? calculateDistance(location.latitude, location.longitude, hospital.location.lat, hospital.location.lng).toFixed(1) + ' km'
              : null;

            return (
              <motion.div 
                key={hospital.name + index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4 hover:bg-zinc-800/40 transition-all border border-zinc-800/50"
              >
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-white font-bold text-sm leading-tight">{hospital.name}</h4>
                      {distance && (
                        <span className="text-[10px] bg-zinc-800 text-cyan-400 font-extrabold px-2 py-0.5 rounded-full shrink-0 border border-zinc-700/50 font-mono">
                          {distance}
                        </span>
                      )}
                    </div>
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
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HospitalList;
