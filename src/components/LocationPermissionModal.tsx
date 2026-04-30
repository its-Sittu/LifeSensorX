import React from 'react';
import { MapPin, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  status: 'idle' | 'loading' | 'active' | 'error' | 'denied';
  onAllow: () => void;
  onDeny: () => void;
}

const LocationPermissionModal: React.FC<Props> = ({ status, onAllow, onDeny }) => {
  // Only show the modal when we haven't asked yet
  const isVisible = status === 'idle';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm glass-card p-8 flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/20 blur-[50px] rounded-full pointer-events-none" />

            <div className="w-16 h-16 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mb-6 text-blue-400">
              <MapPin size={32} />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
              Enable Location Access
            </h2>
            
            <p className="text-zinc-400 text-sm mb-8">
              LifeSensorX requires real-time tracking to ensure your safety. We use this to detect crashes and dispatch emergency links.
            </p>

            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={onAllow}
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                Allow Location
              </button>
              
              <button 
                onClick={onDeny}
                className="w-full py-3.5 rounded-xl bg-zinc-800/50 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors border border-zinc-700/50"
              >
                Deny
              </button>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
              <ShieldAlert size={14} />
              <span>Your data is stored locally.</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationPermissionModal;
