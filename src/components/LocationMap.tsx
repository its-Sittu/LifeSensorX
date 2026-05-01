import React from 'react';
import { Navigation, Map, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { LocationStatus } from '../hooks/useLocation';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  status: LocationStatus;
  location: LocationState;
  errorMsg: string | null;
}

const LocationMap: React.FC<Props> = ({ status, location, errorMsg }) => {
  const displayLat = location.latitude ? Math.abs(location.latitude).toFixed(4) + (location.latitude >= 0 ? 'N' : 'S') : '--';
  const displayLng = location.longitude ? Math.abs(location.longitude).toFixed(4) + (location.longitude >= 0 ? 'E' : 'W') : '--';
  const mapsLink = (location.latitude && location.longitude) 
    ? `https://maps.google.com/?q=${location.latitude},${location.longitude}` 
    : '#';

  return (
    <div className="glass-card p-4 flex flex-col gap-4">
      
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">Live Tracking</h3>
        <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
          {status === 'active' ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-xs font-medium text-emerald-400">Tracking Active</span>
            </>
          ) : status === 'loading' ? (
            <>
              <Loader2 size={12} className="text-blue-400 animate-spin" />
              <span className="text-xs font-medium text-blue-400">Acquiring...</span>
            </>
          ) : status === 'unavailable' ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <span className="text-xs font-medium text-amber-500">GPS Off</span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-xs font-medium text-red-400">Tracking Stopped</span>
            </>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-64 bg-[#0a0f18] rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
        
        {/* Radar Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 243, 255, 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 243, 255, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />

        {status === 'active' && (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border border-cyan-500/20" />
              <div className="absolute w-32 h-32 rounded-full border border-cyan-500/20" />
            </div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none origin-center"
              style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(0, 243, 255, 0.4) 100%)' }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400">
              <Navigation size={24} className="fill-cyan-400 animate-pulse" style={{ transform: 'rotate(45deg)' }} />
            </div>
          </>
        )}

        {(status === 'error' || status === 'denied' || status === 'unavailable') && (
          <div className="flex flex-col items-center gap-2 text-red-400 z-10 px-4 text-center">
            <AlertTriangle size={32} />
            <p className="text-sm font-medium">{errorMsg || 'Location Unavailable'}</p>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-2 text-blue-400 z-10">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm font-medium">Fetching GPS Data...</p>
          </div>
        )}
      </div>

      {/* Coordinates */}
      <div className="flex flex-col gap-1 text-sm font-mono tracking-wider text-zinc-300 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
        <p>LAT: <span className="text-cyan-400">{displayLat}</span></p>
        <p>LONG: <span className="text-cyan-400">{displayLng}</span></p>
      </div>

      {/* Action Button */}
      <a 
        href={status === 'active' ? mapsLink : undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full mt-2 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
          status === 'active' 
            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] active:scale-95'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
        }`}
        onClick={(e) => {
          if (status !== 'active') {
            e.preventDefault();
            alert(errorMsg || 'Please allow location tracking first.');
          }
        }}
      >
        <Map size={18} />
        Open in Google Maps
      </a>
      
      {/* Specific Link Display as Requested */}
      {status === 'active' && (
        <div className="mt-2 text-[10px] text-zinc-500 text-center truncate px-2">
          {mapsLink}
        </div>
      )}
    </div>
  );
};

export default LocationMap;
