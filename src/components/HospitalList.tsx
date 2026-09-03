import React, { useEffect, useState } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { fetchNearbyHospitals } from '../utils/api';
import { HeartPulse, Navigation, Loader2, Phone, MapPin, Search, Sparkles, BedDouble } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
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
    let lat = location.latitude;
    let lng = location.longitude;
    
    if (!lat || !lng) {
      try {
        const saved = localStorage.getItem('last_known_location');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.latitude && parsed.longitude) {
            lat = parsed.latitude;
            lng = parsed.longitude;
          }
        }
      } catch (e) {}
    }

    if (lat && lng) {
      getHospitals(lat, lng);
    }
  }, [location.latitude, location.longitude]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    getHospitals(null, null, searchQuery.trim());
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          Nearby Hospitals & AI Triage
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
                Scanning for medical help nearby...
              </p>
            </div>
          )}

          {hospitals.slice(0, 5).map((hospital, index) => {
            const distance = (location.latitude && location.longitude && hospital.location)
              ? calculateDistance(location.latitude, location.longitude, hospital.location.lat, hospital.location.lng).toFixed(1) + ' km'
              : hospital.distanceKm ? `${hospital.distanceKm} km` : null;

            const isTopRecommended = hospital.isRecommended || index === 0;

            return (
              <motion.div 
                key={hospital.name + index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card p-4 hover:bg-zinc-800/40 transition-all border ${
                  isTopRecommended 
                    ? 'border-cyan-500/40 bg-gradient-to-br from-cyan-950/20 via-zinc-900/60 to-blue-950/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                    : 'border-zinc-800/50'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div>
                    {/* Top Recommendation Badge */}
                    {isTopRecommended && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full w-fit mb-2">
                        <Sparkles size={12} className="animate-pulse" />
                        AI Recommended Hospital
                        {hospital.score && (
                          <span className="ml-1 px-1.5 py-0.2 bg-cyan-500/20 rounded font-mono text-[10px]">
                            {hospital.score}/100
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-white font-bold text-sm leading-tight">{hospital.name}</h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hospital.score && !isTopRecommended && (
                          <span className="text-[10px] bg-zinc-800/80 text-zinc-400 font-mono px-2 py-0.5 rounded-full border border-zinc-700/50">
                            Score: {hospital.score}
                          </span>
                        )}
                        {distance && (
                          <span className="text-[10px] bg-zinc-800 text-cyan-400 font-extrabold px-2 py-0.5 rounded-full shrink-0 border border-zinc-700/50 font-mono">
                            {distance}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-zinc-500 text-[11px] mt-1 flex items-start gap-1">
                      <MapPin size={12} className="shrink-0 mt-0.5 text-zinc-400" />
                      <span>{hospital.address}</span>
                    </p>

                    {/* Official Phone Number Badge */}
                    {hospital.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono font-medium mt-1 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20 w-fit">
                        <Phone size={11} className="shrink-0" />
                        <span>{hospital.phone}</span>
                      </div>
                    )}

                    {/* AI Explainability Reason */}
                    {hospital.reason && (
                      <p className="text-[11px] text-cyan-300/80 mt-1.5 bg-zinc-950/60 p-1.5 rounded-lg border border-cyan-500/10 italic">
                        💡 {hospital.reason}
                      </p>
                    )}

                    {/* Bed Capacity Indicator */}
                    {hospital.beds && (
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <BedDouble size={12} className="text-emerald-400" />
                          ICU Beds: <b className="text-zinc-200">{hospital.beds.icu?.available ?? 0}</b>
                        </span>
                        <span className="flex items-center gap-1">
                          Emergency Beds: <b className="text-zinc-200">{hospital.beds.emergency?.available ?? 0}</b>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {hospital.phone ? (
                      <a 
                        href={`tel:${hospital.phone.replace(/[\s\-()]/g, '')}`}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all truncate px-3"
                        title={`Call ${hospital.phone}`}
                      >
                        <Phone size={14} className="shrink-0 animate-bounce" />
                        <span className="truncate font-semibold">Call {hospital.phone}</span>
                      </a>
                    ) : (
                      <div 
                        className="flex-1 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-zinc-500 text-xs font-medium flex items-center justify-center gap-1.5 px-3"
                        title="Phone number unlisted on map"
                      >
                        <Phone size={14} className="shrink-0 opacity-40" />
                        <span>Phone Unlisted</span>
                      </div>
                    )}

                    <button 
                      onClick={() => {
                        const origin = (location.latitude && location.longitude) ? `&origin=${location.latitude},${location.longitude}` : '';
                        window.open(`https://www.google.com/maps/dir/?api=1${origin}&destination=${hospital.location.lat},${hospital.location.lng}&travelmode=driving`, '_blank');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all px-3"
                    >
                      <Navigation size={14} className="shrink-0" />
                      <span>Directions</span>
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
