// Ultra-Reliable Universal Audio Alarm with Embedded Base64 Siren, True iOS/Android Autoplay Unlock & Web Audio Pulse Engine
import { EMERGENCY_SIREN_DATA_URI } from './sirenBase64';

let audioCtx: AudioContext | null = null;
let sirenAudioElement: HTMLAudioElement | null = null;
let isAlarmPlaying = false;
let pulseInterval: any = null;
let isAudioHardwareUnlocked = false;

// Initialize the embedded HTML5 Audio Element immediately
export const getAudioElement = (): HTMLAudioElement => {
  if (!sirenAudioElement && typeof Audio !== 'undefined') {
    sirenAudioElement = new Audio(EMERGENCY_SIREN_DATA_URI);
    sirenAudioElement.loop = true;
    sirenAudioElement.volume = 1.0;
    sirenAudioElement.preload = 'auto';
  }
  return sirenAudioElement!;
};

// Initialize Web Audio Context
export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContextClass();
      }
    }
  } catch (e) {
    console.warn('[Audio] AudioContext init error:', e);
  }
  return audioCtx;
};

// Universal Mobile & Desktop Autoplay Unlocker
// Crucial: Plays 1 silent sample on AudioContext AND primes HTMLAudioElement to satisfy iOS Safari & Chrome
export const unlockAudio = () => {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play 1-sample silent buffer on Web Audio to unlock hardware
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }

    // Prime HTML5 Audio element so future async play() is never blocked
    const audio = getAudioElement();
    if (audio) {
      audio.volume = 1.0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (!isAlarmPlaying) {
              audio.pause();
              audio.currentTime = 0;
            }
            isAudioHardwareUnlocked = true;
            console.log('[Audio] HTML5 Audio & WebAudio unlocked permanently');
          })
          .catch(() => {
            // Still waiting for user interaction
          });
      }
    }
  } catch (e) {
    console.warn('[Audio] Unlock error:', e);
  }
};

// Automatically listen to ALL possible user touch/click/scroll events to auto-unlock on first arrival
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click', 'scroll'];
  const handleInteraction = () => {
    unlockAudio();
    if (isAudioHardwareUnlocked) {
      unlockEvents.forEach(evt => window.removeEventListener(evt, handleInteraction));
    }
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, handleInteraction, { passive: true }));
}

// Play a high-volume emergency beep pulse via Web Audio
const playWebAudioBeep = (highTone: boolean) => {
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

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.33);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.34);
  } catch (err) {}
};

// Start Emergency Siren Directly
export const startEmergencyAlarm = () => {
  console.log('🚨 [AudioAlarm] STARTING INSTANT EMERGENCY SIREN!');
  isAlarmPlaying = true;

  // 1. Channel 1: Embedded Base64 Siren Audio
  try {
    const audio = getAudioElement();
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 1.0;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(e => {
          console.log('[AudioAlarm] HTML5 Audio deferred to WebAudio:', e.message);
        });
      }
    }
  } catch (err) {
    console.warn('[AudioAlarm] HTML5 Audio play error:', err);
  }

  // 2. Channel 2: Real-time Web Audio Dual-Tone Pulse Generator
  try {
    let high = true;
    playWebAudioBeep(high);
    
    if (pulseInterval) clearInterval(pulseInterval);
    pulseInterval = setInterval(() => {
      if (!isAlarmPlaying) return;
      high = !high;
      playWebAudioBeep(high);
    }, 350);
  } catch (err) {
    console.warn('[AudioAlarm] WebAudio generator error:', err);
  }

  // 3. Channel 3: Strong Phone Vibration Pattern
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([600, 200, 600, 200, 600, 200, 600, 200, 600]);
    } catch {}
  }
};

// Stop Emergency Siren
export const stopEmergencyAlarm = () => {
  console.log('🛑 [AudioAlarm] STOPPING EMERGENCY SIREN');
  isAlarmPlaying = false;

  if (pulseInterval) {
    clearInterval(pulseInterval);
    pulseInterval = null;
  }

  if (sirenAudioElement) {
    try {
      sirenAudioElement.pause();
      sirenAudioElement.currentTime = 0;
    } catch {}
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
};

export const registerAutoplayBlockedListener = (_cb: (blocked: boolean) => void) => {};
