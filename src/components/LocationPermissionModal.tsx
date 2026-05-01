import React from 'react';
import { MapPin, ShieldAlert, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocationStatus } from '../hooks/useLocation';

interface Props {
  status: LocationStatus;
  errorMsg: string | null;
  onAllow: () => void;
}

const LocationPermissionModal: React.FC<Props> = ({ status, errorMsg, onAllow }) => {
  // Show modal if not active and not in a completely terminal error state (though we show errors inside)
  const isVisible = status !== 'active';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm glass-card p-8 flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Background glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 blur-[50px] rounded-full pointer-events-none transition-colors duration-500 ${
              status === 'denied' || status === 'unavailable' ? 'bg-red-500/20' : 'bg-blue-500/20'
            }`} />

            <div className={`w-16 h-16 rounded-full border flex items-center justify-center mb-6 transition-colors duration-300 ${
              status === 'denied' || status === 'unavailable' 
                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                : 'bg-zinc-800/80 border-zinc-700 text-blue-400'
            }`}>
              {status === 'loading' ? (
                <Loader2 size={32} className="animate-spin" />
              ) : status === 'denied' || status === 'unavailable' ? (
                <AlertCircle size={32} />
              ) : (
                <MapPin size={32} />
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
              {status === 'denied' ? 'Permission Denied' : 
               status === 'unavailable' ? 'GPS is Off' : 
               status === 'loading' ? 'Fetching Location...' : 
               'Enable Location Access'}
            </h2>
            
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              {errorMsg || 'LifeSensorX requires real-time tracking to ensure your safety. We use this to detect crashes and dispatch emergency links.'}
            </p>

            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={onAllow}
                disabled={status === 'loading'}
                className={`w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${
                  status === 'denied' || status === 'unavailable'
                    ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                }`}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Connecting to GPS...
                  </>
                ) : status === 'denied' || status === 'unavailable' ? (
                  <>
                    <RefreshCw size={18} />
                    Try Again
                  </>
                ) : (
                  'Allow Location Access'
                )}
              </button>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
              <ShieldAlert size={14} />
              <span>{status === 'loading' ? 'Waiting for hardware signal...' : 'Your data is handled securely.'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationPermissionModal;
