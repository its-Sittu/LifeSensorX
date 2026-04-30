import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info } from 'lucide-react';

interface Props {
  isVisible: boolean;
  message: string;
  type?: 'success' | 'info';
  onClose?: () => void;
}

const AlertPopup: React.FC<Props> = ({ isVisible, message, type = 'success', onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm"
        >
          <div className="glass-card p-4 flex items-center gap-3 bg-zinc-900/95 border border-zinc-700 shadow-2xl">
            {type === 'success' ? (
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Info size={20} />
              </div>
            )}
            <p className="text-sm font-medium text-white">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AlertPopup;
