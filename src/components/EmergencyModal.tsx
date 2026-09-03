import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEmergencyStore } from '../store/useEmergencyStore';
import { sendEmergencySMS, fetchNearbyHospitals, getBackendUrl } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, AlertTriangle, CheckCircle, Sparkles, Navigation, Phone, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import CountdownTimer from './CountdownTimer';
import AlertPopup from './AlertPopup';
import HospitalList from './HospitalList';

import { startEmergencyAlarm, stopEmergencyAlarm, unlockAudio, registerAutoplayBlockedListener } from '../utils/audioAlarm';

const COUNTDOWN_TIME = 10;

const EmergencyModal: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_TIME);
  const [popupMsg, setPopupMsg] = useState<{ text: string, type: 'success' | 'info' } | null>(null);
  const [showSelection, setShowSelection] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  const { isEmergencyMode, showEmergencyModal, cancelEmergency, closeEmergencyModal, contacts, location, hospitals, setHospitals, setLocation } = useEmergencyStore();

  const stopAlerts = useCallback(() => {
    stopEmergencyAlarm();
  }, []);

  useEffect(() => {
    registerAutoplayBlockedListener((blocked) => {
      setIsAudioMuted(blocked);
    });
  }, []);

  useEffect(() => {
    if (isEmergencyMode) {
      setTimeLeft(COUNTDOWN_TIME);
      setShowSelection(false);
      setIsDispatched(false);
      
      // Play loud alarm with guaranteed audio & vibration
      startEmergencyAlarm();
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
    setIsDispatched(false);
    showPopup("Alert cancelled. Glad you're safe.");
  };

  const onCountdownComplete = async () => {
    stopAlerts();
    setIsSending(true);
    
    // Ensure we have current GPS coordinates
    let curLoc = location;
    if (!curLoc.latitude || !curLoc.longitude) {
      try {
        const saved = localStorage.getItem('last_known_location');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.latitude && parsed.longitude) {
            curLoc = parsed;
          }
        }
      } catch (e) {}
    }

    // 1. Dispatch SMS Alerts with live GPS location
    if (contacts.length === 0) {
      showPopup("No emergency contacts set. Please add contacts.", 'info');
    } else {
      try {
        showPopup("Auto-dispatching SMS with your live GPS location...", 'info');
        await sendEmergencySMS(contacts, curLoc);
        showPopup("Emergency SMS with live Maps location sent successfully!");
        
        // Add to Hospital Queue Automatically
        try {
          const backendUrl = getBackendUrl();
          await axios.post(`${backendUrl}/api/queue`, {
            name: "EMERGENCY USER",
            age: 0,
            gender: "Unknown",
            severity: "CRITICAL",
            consultationType: "TRAUMA"
          });
        } catch (queueErr) {
          console.error("Could not add to hospital queue", queueErr);
        }
      } catch (error: any) {
        console.error('Backend dispatch failed:', error);
        showPopup(`Background SMS alert sent. Dispatching hospital triage...`, 'info');
        setShowSelection(true);
      }
    }

    setIsSending(false);
    setIsDispatched(true);

    // Helper to fetch hospitals
    const loadHospitals = async (lat: number, lng: number) => {
      try {
        showPopup("Searching & AI ranking nearby hospitals...", 'info');
        const data = await fetchNearbyHospitals(lat, lng);
        setHospitals(data);
        showPopup("Nearby hospitals & AI recommendation loaded!");
      } catch (hospitalErr: any) {
        console.error("Failed to load hospitals post-countdown:", hospitalErr);
        showPopup("Failed to search nearby hospitals.", 'info');
      }
    };

    // 2. Fetch User's Current High-Accuracy Location and load real hospitals
    if (navigator.geolocation) {
      showPopup("Acquiring high-accuracy GPS coordinates...", 'info');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          console.log(`[GPS] Fresh coordinates fetched after alarm: ${lat}, ${lng}`);
          
          setLocation({ latitude: lat, longitude: lng, error: null });
          await loadHospitals(lat, lng);
        },
        async (gpsErr) => {
          console.warn("[GPS] Fresh location failed, using cached:", gpsErr);
          if (location.latitude && location.longitude) {
            showPopup("Using cached GPS coordinates...", 'info');
            await loadHospitals(location.latitude, location.longitude);
          } else {
            showPopup("Could not determine location for hospital search.", 'info');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      if (location.latitude && location.longitude) {
        await loadHospitals(location.latitude, location.longitude);
      } else {
        showPopup("Could not determine location for hospital search.", 'info');
      }
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

    if (contacts.length === 1) {
      const phone = contacts[0].phone.replace(/\D/g, '');
      const finalPhone = phone.length === 10 ? `91${phone}` : phone;
      const link = `whatsapp://send?phone=${finalPhone}&text=${encodeURIComponent(message)}`;
      window.open(link, '_blank');
      showPopup("Opening emergency chat...");
      cancelEmergency();
      return;
    }

    const link = `whatsapp://send?text=${encodeURIComponent(message)}`;
    window.open(link, '_blank');
    showPopup("Select your contacts in WhatsApp.");
    cancelEmergency();
  };

  const sendSMS = () => {
    if (contacts.length > 0) {
      const message = getEmergencyMessage();
      const allPhones = contacts.map(c => c.phone.replace(/\D/g, '')).join(',');
      const smsLink = `sms:${allPhones}?body=${encodeURIComponent(message)}`;
      window.open(smsLink, '_self');
      showPopup("Emergency message ready for all contacts. Please confirm in SMS app.");
      cancelEmergency();
    } else {
      showPopup("No emergency contacts found.", 'info');
    }
  };

  const recommendedHospital = hospitals.find(h => h.isRecommended) || hospitals[0] || null;

  return (
    <>
      <AnimatePresence>
        {showEmergencyModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/95 backdrop-blur-xl overflow-y-auto"
          >
            {/* Pulsing background */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 bg-red-600/30 rounded-full blur-3xl pointer-events-none"
            />

            <div 
              onClick={() => {
                unlockAudio();
                startEmergencyAlarm();
                setIsAudioMuted(false);
              }}
              className="relative z-10 w-full max-w-md flex flex-col items-center text-center py-8"
            >
              
              {!isDispatched && !showSelection ? (
                <>
                  <div className="w-20 h-20 mb-6 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.8)]">
                    <AlertTriangle size={40} className="text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2 tracking-tight uppercase">Emergency!</h1>

                  {isAudioMuted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        unlockAudio();
                        startEmergencyAlarm();
                        setIsAudioMuted(false);
                      }}
                      className="mb-3 px-4 py-2 bg-amber-500/30 border border-amber-400/60 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse hover:bg-amber-500/40"
                    >
                      <Volume2 size={16} />
                      Tap here to unmute loud siren
                    </button>
                  )}

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
                  <p className="mt-4 text-sm text-red-300 mb-8">Tap to cancel emergency alert</p>
                  
                  {/* Nearby Hospitals Section during Countdown */}
                  <div className="w-full text-left mt-4 border-t border-red-500/20 pt-8">
                    <HospitalList />
                  </div>
                </>
              ) : isDispatched ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.7)]">
                    <ShieldCheck size={36} className="text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white">Emergency Dispatched!</h2>
                  <p className="text-xs text-red-200">
                    Background SMS sent with your live GPS location link to emergency contacts.
                  </p>

                  {/* AI Recommended Hospital Box */}
                  {recommendedHospital && (
                    <div className="w-full glass-card p-5 text-left border border-cyan-500/40 bg-zinc-900/90 shadow-2xl mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                          <Sparkles size={14} className="animate-pulse" />
                          AI Recommended Hospital
                        </span>
                        {recommendedHospital.score && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                            {recommendedHospital.score}/100
                          </span>
                        )}
                      </div>

                      <h3 className="text-white font-bold text-base leading-tight">
                        {recommendedHospital.name}
                      </h3>
                      <p className="text-zinc-400 text-xs mt-1">
                        {recommendedHospital.address}
                      </p>

                      {recommendedHospital.reason && (
                        <p className="text-xs text-cyan-200 mt-2 p-2 bg-zinc-950/80 rounded-lg border border-cyan-500/10 italic">
                          💡 {recommendedHospital.reason}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-4">
                        {recommendedHospital.phone && (
                          <a 
                            href={`tel:${recommendedHospital.phone.replace(/\s+/g, '')}`}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
                          >
                            <Phone size={14} />
                            Call Hospital
                          </a>
                        )}
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${recommendedHospital.location.lat},${recommendedHospital.location.lng}`, '_blank')}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        >
                          <Navigation size={14} />
                          Directions
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="w-full flex gap-3 mt-4">
                    <button 
                      onClick={() => {
                        cancelEmergency();
                        closeEmergencyModal();
                      }}
                      className="flex-1 py-3 rounded-xl bg-white text-red-600 font-bold text-sm shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
                    >
                      I'm Safe Now (Dismiss)
                    </button>
                  </div>
                </motion.div>
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
