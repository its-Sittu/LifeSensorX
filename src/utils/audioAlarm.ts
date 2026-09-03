// Universal Mobile/Desktop Audio Alarm Manager with Dual WebAudio Siren & Autoplay Unlock

let audioCtx: AudioContext | null = null;
let sirenOsc1: OscillatorNode | null = null;
let sirenOsc2: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenLFO: OscillatorNode | null = null;
let sirenLFOGain: GainNode | null = null;
let audioElement: HTMLAudioElement | null = null;
let isAudioRunning = false;
let onAutoplayBlockedCallback: ((blocked: boolean) => void) | null = null;

// Get or initialize AudioContext
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

// Universal Mobile Autoplay Unlocker
export const unlockAudio = () => {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Play a short silent buffer to satisfy iOS Safari & Chrome autoplay unlock requirements
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }

    if (!audioElement && typeof Audio !== 'undefined') {
      // Free reliable fallback emergency tone
      audioElement = new Audio('https://actions.google.com/sounds/v1/alarms/emergency_siren_short_burst.ogg');
      audioElement.loop = true;
      audioElement.volume = 1.0;
      audioElement.load();
    }

    console.log('[Audio] Audio context unlocked successfully.');
  } catch (e) {
    console.warn('[Audio] Failed to unlock audio context:', e);
  }
};

// Auto-register touch/click listeners to pre-unlock audio
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click', 'pointerdown'];
  const handleFirstInteraction = () => {
    unlockAudio();
    unlockEvents.forEach(evt => window.removeEventListener(evt, handleFirstInteraction));
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, handleFirstInteraction, { passive: true }));
}

// Generate Piercing Emergency Siren using Web Audio API (Zero-dependency & 100% Offline)
const startWebAudioSiren = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        if (onAutoplayBlockedCallback) onAutoplayBlockedCallback(true);
      });
    }

    if (sirenOsc1 || sirenOsc2) return true;

    // Master Siren Gain
    sirenGain = ctx.createGain();
    sirenGain.gain.setValueAtTime(0.5, ctx.currentTime);

    // Main Tone Oscillator (European Two-Tone / Yelp Siren)
    sirenOsc1 = ctx.createOscillator();
    sirenOsc1.type = 'sawtooth';
    sirenOsc1.frequency.setValueAtTime(750, ctx.currentTime);

    // Harmonic Richness (Square wave 1 octave lower)
    sirenOsc2 = ctx.createOscillator();
    sirenOsc2.type = 'square';
    sirenOsc2.frequency.setValueAtTime(375, ctx.currentTime);

    // LFO to modulate siren pitch up and down (2.5 Hz warble)
    sirenLFO = ctx.createOscillator();
    sirenLFO.type = 'triangle';
    sirenLFO.frequency.setValueAtTime(2.2, ctx.currentTime);

    sirenLFOGain = ctx.createGain();
    sirenLFOGain.gain.setValueAtTime(320, ctx.currentTime); // Pitch swing +-320Hz

    // Connect LFO to Frequency
    sirenLFO.connect(sirenLFOGain);
    sirenLFOGain.connect(sirenOsc1.frequency);

    // Connect to Master Gain & Destination
    sirenOsc1.connect(sirenGain);
    sirenOsc2.connect(sirenGain);
    sirenGain.connect(ctx.destination);

    sirenLFO.start();
    sirenOsc1.start();
    sirenOsc2.start();

    isAudioRunning = true;
    if (onAutoplayBlockedCallback) onAutoplayBlockedCallback(false);
    console.log('[Audio] WebAudio Emergency Siren started.');
    return true;
  } catch (err) {
    console.warn('[Audio] WebAudio Siren start failed:', err);
    return false;
  }
};

const stopWebAudioSiren = () => {
  try {
    if (sirenLFO) {
      sirenLFO.stop();
      sirenLFO.disconnect();
      sirenLFO = null;
    }
    if (sirenOsc1) {
      sirenOsc1.stop();
      sirenOsc1.disconnect();
      sirenOsc1 = null;
    }
    if (sirenOsc2) {
      sirenOsc2.stop();
      sirenOsc2.disconnect();
      sirenOsc2 = null;
    }
    if (sirenGain) {
      sirenGain.disconnect();
      sirenGain = null;
    }
    if (sirenLFOGain) {
      sirenLFOGain.disconnect();
      sirenLFOGain = null;
    }
    isAudioRunning = false;
  } catch (err) {
    console.warn('[Audio] Error stopping siren:', err);
  }
};

export const registerAutoplayBlockedListener = (cb: (blocked: boolean) => void) => {
  onAutoplayBlockedCallback = cb;
};

// Start Emergency Alarm (Dual: WebAudio Synth + HTML5 Audio + Vibration)
export const startEmergencyAlarm = () => {
  unlockAudio();

  // 1. Start High-Volume Synthesizer Siren
  const synthStarted = startWebAudioSiren();

  // 2. Also attempt HTML5 Audio playback as secondary channel
  try {
    if (!audioElement && typeof Audio !== 'undefined') {
      audioElement = new Audio('https://actions.google.com/sounds/v1/alarms/emergency_siren_short_burst.ogg');
      audioElement.loop = true;
    }
    if (audioElement) {
      audioElement.currentTime = 0;
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log('[Audio] HTML5 audio autoplay rejected, WebAudio active:', err.message);
          if (!synthStarted && onAutoplayBlockedCallback) {
            onAutoplayBlockedCallback(true);
          }
        });
      }
    }
  } catch (e) {
    console.log('[Audio] HTML5 Audio fallback error:', e);
  }

  // 3. Trigger Phone Vibration Pattern
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([600, 200, 600, 200, 600, 200, 600, 200, 600]);
    } catch {}
  }
};

// Stop Emergency Alarm
export const stopEmergencyAlarm = () => {
  stopWebAudioSiren();

  if (audioElement) {
    try {
      audioElement.pause();
      audioElement.currentTime = 0;
    } catch {}
  }

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }

  if (onAutoplayBlockedCallback) {
    onAutoplayBlockedCallback(false);
  }
};
