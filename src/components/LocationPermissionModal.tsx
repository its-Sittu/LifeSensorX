import React from 'react';
import { MapPin, Info, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocationStatus } from '../hooks/useLocation';

interface Props {
  status: LocationStatus;
  errorMsg: string | null;
  onAllow: () => void;
}

const LocationPermissionModal: React.FC<Props> = ({ status, errorMsg, onAllow }) => {
  // Show modal if not active
  const isVisible = status !== 'active';

  return (
    <AnimatePresence>
      {isVisible && (status !== 'denied' && status !== 'unavailable' && status !== 'loading') && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] p-8 flex flex-col items-center text-center shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
              <MapPin size={28} className="fill-blue-600/10" />
            </div>

            <h2 className="text-xl font-bold text-zinc-900 mb-2">Enable Location Accuracy</h2>
            <p className="text-zinc-500 text-sm mb-8 px-2">
              To provide fast emergency response, your device location should be <span className="font-semibold text-zinc-900">ON</span> with high accuracy.
            </p>

            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={onAllow}
                className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-bold text-base hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-zinc-200"
              >
                Turn On
              </button>
              
              <button 
                className="w-full py-3 text-zinc-400 font-semibold text-sm hover:text-zinc-600 transition-colors"
                onClick={() => alert("Location is required for this app to work.")}
              >
                No Thanks
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-50 px-4 py-2 rounded-full">
              <Info size={14} />
              <span>High accuracy improves emergency results</span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Error / Loading State Overlay (Rapido Style) */}
      {isVisible && (status === 'denied' || status === 'unavailable' || status === 'loading') && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[101] flex items-center justify-center p-6 bg-white"
        >
          <div className="w-full max-w-xs flex flex-col items-center text-center">
            {status === 'loading' ? (
              <>
                <div className="relative w-20 h-20 mb-8">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-blue-500 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                    <Loader2 size={40} className="animate-spin" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Fetching Location</h2>
                <p className="text-zinc-500 text-sm">Please wait while we connect to GPS satellites...</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-8 text-red-500">
                  <AlertCircle size={40} />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-2">
                  {status === 'denied' ? 'Permission Denied' : 'Location is Off'}
                </h2>
                <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
                  {status === 'unavailable' 
                    ? 'Please turn on your device location (GPS) from settings to continue.' 
                    : 'Location access is required. Please enable it in browser settings.'}
                </p>
                <button 
                  onClick={onAllow}
                  className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-bold flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <Settings size={20} />
                  Open Settings / Retry
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationPermissionModal;
