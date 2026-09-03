// Ultra-Reliable Instant Sound System with Embedded Base64 Siren, Web Audio Engine & Mobile Vibration
import { EMERGENCY_SIREN_DATA_URI } from './sirenBase64';

let audioCtx: AudioContext | null = null;
let sirenAudioElement: HTMLAudioElement | null = null;
let isAlarmPlaying = false;
let pulseInterval: any = null;

// Initialize the embedded HTML5 Audio Element immediately
const getAudioElement = (): HTMLAudioElement => {
  if (!sirenAudioElement && typeof Audio !== 'undefined') {
    sirenAudioElement = new Audio(EMERGENCY_SIREN_DATA_URI);
    sirenAudioElement.loop = true;
    sirenAudioElement.volume = 1.0;
    sirenAudioElement.preload = 'auto';
  }
  return sirenAudioElement!;
};

// Initialize Web Audio Context
const getAudioContext = (): AudioContext | null => {
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

// Prime / unlock audio on any early user presence
export const unlockAudio = () => {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const audio = getAudioElement();
    if (audio) {
      audio.load();
    }
  } catch (e) {}
};

// Auto-prime on any window interaction (passive, zero impact)
if (typeof window !== 'undefined') {
  const primeEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click', 'pointerdown', 'mousemove', 'scroll'];
  const handleInteraction = () => {
    unlockAudio();
  };
  primeEvents.forEach(evt => window.addEventListener(evt, handleInteraction, { passive: true }));
}

// Play a piercing emergency beep pulse via Web Audio
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

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.33);
  } catch (err) {}
};

// Start Emergency Siren Directly
export const startEmergencyAlarm = () => {
  if (isAlarmPlaying) return;
  isAlarmPlaying = true;
  console.log('🚨 [AudioAlarm] STARTING INSTANT EMERGENCY SIREN!');

  // 1. Channel 1: Embedded Base64 Siren Audio (Zero Network Dependency)
  try {
    const audio = getAudioElement();
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 1.0;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(e => {
          console.log('[AudioAlarm] HTML5 Audio autoplay policy deferred, WebAudio pulse active:', e.message);
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
