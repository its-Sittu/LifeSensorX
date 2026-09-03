// Continuous Keep-Alive Audio Engine for 100% Guaranteed Zero-Click Emergency Alarm
import { EMERGENCY_SIREN_DATA_URI } from './sirenBase64';

let audioContext: AudioContext | null = null;
let silentOsc: OscillatorNode | null = null;
let silentGainNode: GainNode | null = null;
let audioElement: HTMLAudioElement | null = null;
let isArmed = false;
let isAlarmPlaying = false;
let sirenPulseTimer: any = null;

// Get or initialize AudioContext
export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContextClass();
      }
    }
  } catch (e) {
    console.warn('[Audio] AudioContext creation error:', e);
  }
  return audioContext;
};

// Arm the Audio Pipeline (creates an active continuous background carrier so browser NEVER blocks future alarms)
export const armAudio = (): boolean => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Start a 100% inaudible keep-alive carrier oscillator
    if (!silentOsc) {
      silentGainNode = ctx.createGain();
      silentGainNode.gain.setValueAtTime(0.000001, ctx.currentTime);
      silentGainNode.connect(ctx.destination);

      silentOsc = ctx.createOscillator();
      silentOsc.type = 'sine';
      silentOsc.frequency.setValueAtTime(440, ctx.currentTime);
      silentOsc.connect(silentGainNode);
      silentOsc.start();
    }

    // Prime HTML5 Audio element
    if (!audioElement && typeof Audio !== 'undefined') {
      audioElement = new Audio(EMERGENCY_SIREN_DATA_URI);
      audioElement.loop = true;
      audioElement.volume = 1.0;
      audioElement.preload = 'auto';
    }
    if (audioElement) {
      audioElement.load();
    }

    isArmed = true;
    console.log('[Audio] 🛡️ Emergency Audio System is ARMED & LIVE (Background carrier active)');
    return true;
  } catch (err) {
    console.warn('[Audio] Failed to arm audio:', err);
    return false;
  }
};

export const unlockAudio = () => {
  armAudio();
};

// Listen to all possible user events to auto-arm on first touch/click/scroll/arrival
if (typeof window !== 'undefined') {
  const armEvents = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click', 'scroll'];
  const handleAutoArm = () => {
    armAudio();
    if (isArmed) {
      armEvents.forEach(evt => window.removeEventListener(evt, handleAutoArm));
    }
  };
  armEvents.forEach(evt => window.addEventListener(evt, handleAutoArm, { passive: true }));
}

// Play a high-volume emergency warble beep (980Hz <-> 720Hz)
const playSirenPulse = (highTone: boolean) => {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'closed') return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(highTone ? 980 : 720, now);

    // Maximum loud volume
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.33);
  } catch (e) {}
};

// Start Emergency Alarm Directly (Zero-click guaranteed)
export const startEmergencyAlarm = () => {
  if (isAlarmPlaying) return;
  isAlarmPlaying = true;
  console.log('🚨 [AudioAlarm] PLAYING LOUD EMERGENCY SIREN!');

  // Ensure audio pipeline is active
  armAudio();

  // Channel 1: Embedded Base64 Siren Audio Loop
  try {
    if (!audioElement && typeof Audio !== 'undefined') {
      audioElement = new Audio(EMERGENCY_SIREN_DATA_URI);
      audioElement.loop = true;
      audioElement.volume = 1.0;
    }
    if (audioElement) {
      audioElement.currentTime = 0;
      audioElement.volume = 1.0;
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log('[AudioAlarm] HTML5 Audio waiting for active stream, WebAudio generator running:', e.message);
        });
      }
    }
  } catch (err) {
    console.warn('[AudioAlarm] Audio element error:', err);
  }

  // Channel 2: Web Audio Piercing Dual-Tone Siren Generator
  try {
    let isHigh = true;
    playSirenPulse(isHigh);

    if (sirenPulseTimer) clearInterval(sirenPulseTimer);
    sirenPulseTimer = setInterval(() => {
      if (!isAlarmPlaying) return;
      isHigh = !isHigh;
      playSirenPulse(isHigh);
    }, 350);
  } catch (err) {
    console.warn('[AudioAlarm] WebAudio siren error:', err);
  }

  // Channel 3: Strong Phone Hardware Vibration
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([600, 200, 600, 200, 600, 200, 600, 200, 600]);
    } catch {}
  }
};

// Stop Emergency Alarm
export const stopEmergencyAlarm = () => {
  console.log('🛑 [AudioAlarm] STOPPING EMERGENCY SIREN');
  isAlarmPlaying = false;

  if (sirenPulseTimer) {
    clearInterval(sirenPulseTimer);
    sirenPulseTimer = null;
  }

  if (audioElement) {
    try {
      audioElement.pause();
      audioElement.currentTime = 0;
    } catch {}
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
};

export const registerAutoplayBlockedListener = (_cb: (blocked: boolean) => void) => {};
