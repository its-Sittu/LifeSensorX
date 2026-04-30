import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { generateWhatsAppLink } from '../utils/whatsapp';
import { sendEmergencySMS } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import AlertPopup from './AlertPopup';

const COUNTDOWN_TIME = 10;

const EmergencyModal: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_TIME);
  const [popupMsg, setPopupMsg] = useState<{ text: string, type: 'success' | 'info' } | null>(null);
  const [showSelection, setShowSelection] = useState(false);
  
  const { isEmergencyMode, cancelEmergency, contacts, location } = useEmergencyStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAlerts = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  useEffect(() => {
    if (isEmergencyMode) {
      setTimeLeft(COUNTDOWN_TIME);
      setShowSelection(false);
      
      // Play loud alarm
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
          audioRef.current.loop = true;
        } else {
          audioRef.current.src = 'https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3';
        }
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Audio autoplay prevented.', error);
          });
        }
        
        if ('vibrate' in navigator) {
          navigator.vibrate([500, 500, 500, 500, 500, 500]);
        }
      } catch (err) {
        console.error('Audio/Vibration error:', err);
      }
    } else {
      stopAlerts();
    }

    return () => {
      stopAlerts();
    };
  }, [isEmergencyMode, stopAlerts]);

  const showPopup = (text: string, type: 'success' | 'info' = 'success') => {
    setPopupMsg({ text, type });
    setTimeout(() => setPopupMsg(null), 3000);
  };

  const handleSafe = () => {
    stopAlerts();
    cancelEmergency();
    setShowSelection(false);
    showPopup("Alert cancelled. Glad you're safe.");
  };

  const [isSending, setIsSending] = useState(false);

  const onCountdownComplete = async () => {
    stopAlerts();
    
    if (contacts.length === 0) {
      showPopup("No emergency contacts found.", 'info');
      setShowSelection(true);
      return;
    }

    try {
      setIsSending(true);
      showPopup("Auto-dispatching background SMS alerts...", 'info');
      
      await sendEmergencySMS(contacts, location);
      
      showPopup("Emergency background alerts sent successfully!");
      setIsSending(false);
      cancelEmergency(); // Close modal on total success
    } catch (error: any) {
      console.error('Backend dispatch failed:', error);
      setIsSending(false);
      const errorMsg = error.message || "Unknown error";
      showPopup(`Background alert failed: ${errorMsg}`, 'info');
      setShowSelection(true); // Fallback to manual selection
    }
  };

  const getEmergencyMessage = () => {
    let message = `🚨 Emergency Alert!\nA possible accident has been detected.\nI may need immediate assistance.\n\n`;
    if (location.latitude && location.longitude) {
      const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      message += `📍 My current location:\n${mapsLink}\n\n`;
    }
    message += `Please reach me immediately or send help.`;
    return message;
  };

  const sendWhatsApp = async () => {
    if (contacts.length === 0) {
      showPopup("No emergency contacts found.", 'info');
      return;
    }

    const message = getEmergencyMessage();

    // IF ONLY 1 CONTACT: Open direct chat for maximum speed
    if (contacts.length === 1) {
      const phone = contacts[0].phone.replace(/\D/g, '');
      const finalPhone = phone.length === 10 ? `91${phone}` : phone;
      const link = `whatsapp://send?phone=${finalPhone}&text=${encodeURIComponent(message)}`;
      window.open(link, '_blank');
      showPopup("Opening emergency chat...");
      cancelEmergency();
      return;
    }

    // IF MULTIPLE CONTACTS: Open WhatsApp's internal contact picker
    const link = `whatsapp://send?text=${encodeURIComponent(message)}`;
    window.open(link, '_blank');
    showPopup("Select your contacts in WhatsApp.");
    cancelEmergency();
  };

  const sendSMS = () => {
    if (contacts.length > 0) {
      const message = getEmergencyMessage();
      // Combine all phone numbers separated by commas
      const allPhones = contacts.map(c => c.phone.replace(/\D/g, '')).join(',');
      
      // On some iOS versions ';' is used, but ',' is standard for most modern phones
      const smsLink = `sms:${allPhones}?body=${encodeURIComponent(message)}`;
      window.open(smsLink, '_self');
      showPopup("Emergency message ready for all contacts. Please confirm in SMS app.");
      cancelEmergency();
    } else {
      showPopup("No emergency contacts found.", 'info');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isEmergencyMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/95 backdrop-blur-xl"
          >
            {/* Pulsing background */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 bg-red-600/30 rounded-full blur-3xl pointer-events-none"
            />

            <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">
              <div className="w-20 h-20 mb-6 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.8)]">
                <AlertTriangle size={40} className="text-white" />
              </div>

              {!showSelection ? (
                <>
                  <h1 className="text-3xl font-bold text-white mb-2 tracking-tight uppercase">Emergency!</h1>
                  <CountdownTimer 
                    timeLeft={timeLeft} 
                    setTimeLeft={setTimeLeft} 
                    onComplete={onCountdownComplete} 
                    isActive={isEmergencyMode} 
                  />
                  <button 
                    onClick={handleSafe}
                    className="w-full py-4 rounded-2xl bg-white text-red-600 text-xl font-bold flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95 transition-all mt-4"
                  >
                    <CheckCircle size={28} />
                    I'M SAFE
                  </button>
                  <p className="mt-4 text-sm text-red-300">Tap to cancel emergency alert</p>
                </>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex flex-col gap-4 mt-2"
                >
                  <h2 className="text-2xl font-bold text-white mb-2">Send Alert Via:</h2>
                  <button 
                    onClick={sendWhatsApp}
                    className="w-full py-4 rounded-2xl bg-[#25D366] text-white text-lg font-bold flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(37,211,102,0.4)] active:scale-95 transition-all"
                  >
                    Send via WhatsApp
                  </button>
                  <button 
                    onClick={sendSMS}
                    className="w-full py-4 rounded-2xl bg-blue-600 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-95 transition-all"
                  >
                    Send via SMS
                  </button>
                  <button 
                    onClick={handleSafe}
                    className="mt-4 text-zinc-300 font-medium hover:text-white"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertPopup 
        isVisible={!!popupMsg} 
        message={popupMsg?.text || ''} 
        type={popupMsg?.type}
        onClose={() => setPopupMsg(null)}
      />
    </>
  );
};

export default EmergencyModal;
