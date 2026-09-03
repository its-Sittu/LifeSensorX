// Ultra-Reliable Universal Audio Alarm with Dual-Tone Siren & Multi-Channel Fallback

let audioCtx: AudioContext | null = null;
let isAlarmPlaying = false;
let pulseTimer: any = null;
let fallbackAudio: HTMLAudioElement | null = null;
let isUnlocked = false;

// Initialize or get the global AudioContext
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
    console.warn('[Audio] Failed to construct AudioContext:', e);
  }
  return audioCtx;
};

// Universal Mobile Autoplay Unlocker (iOS Safari, Android Chrome, Desktop)
export const unlockAudio = () => {
  if (isUnlocked && audioCtx && audioCtx.state === 'running') return;

  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play a 1-sample silent buffer to unlock the audio hardware on mobile browsers
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }

    if (!fallbackAudio && typeof Audio !== 'undefined') {
      fallbackAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
      fallbackAudio.loop = true;
      fallbackAudio.volume = 1.0;
    }

    isUnlocked = true;
    console.log('[Audio] Audio hardware unlocked successfully');
  } catch (e) {
    console.warn('[Audio] Unlock error:', e);
  }
};

// Automatically listen to universal touch/click/key events on the window to unlock audio
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click'];
  const handleUserInteraction = () => {
    unlockAudio();
    unlockEvents.forEach(evt => window.removeEventListener(evt, handleUserInteraction));
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, handleUserInteraction, { passive: true }));
}

// Start Dual-Tone Loud Emergency Siren (950Hz <-> 700Hz alternating warble)
const startDualToneSiren = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  let isHighTone = true;

  const playPulse = () => {
    if (!isAlarmPlaying || !ctx || ctx.state === 'closed') return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sharp sawtooth wave for piercing emergency sound
      osc.type = 'sawtooth';
      const freq = isHighTone ? 960 : 720;
      osc.frequency.setValueAtTime(freq, now);
      isHighTone = !isHighTone;

      // Volume envelope: instant attack, punchy decay
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.37);
    } catch (err) {
      console.warn('[Audio] Pulse error:', err);
    }
  };

  // Play immediately and repeat every 380ms
  playPulse();
  if (pulseTimer) clearInterval(pulseTimer);
  pulseTimer = setInterval(playPulse, 380);
};

// Start Emergency Alarm
export const startEmergencyAlarm = () => {
  console.log('[Audio] 🚨 Starting Emergency Siren...');
  isAlarmPlaying = true;
  unlockAudio();

  // Channel 1: High-Performance Web Audio Dual-Tone Siren
  try {
    startDualToneSiren();
  } catch (e) {
    console.warn('[Audio] Web Audio siren failed:', e);
  }

  // Channel 2: Secondary HTML5 Audio fallback (MP3)
  try {
    if (!fallbackAudio && typeof Audio !== 'undefined') {
      fallbackAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
      fallbackAudio.loop = true;
      fallbackAudio.volume = 1.0;
    }
    if (fallbackAudio) {
      fallbackAudio.currentTime = 0;
      const playPromise = fallbackAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log('[Audio] HTML5 audio autoplay waiting for touch:', e.message);
        });
      }
    }
  } catch (e) {
    console.warn('[Audio] Fallback audio error:', e);
  }

  // Channel 3: Strong Mobile Phone Vibration Pattern
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([500, 200, 500, 200, 500, 200, 500, 200, 500]);
    } catch {}
  }
};

// Stop Emergency Alarm
export const stopEmergencyAlarm = () => {
  console.log('[Audio] 🛑 Stopping Emergency Siren...');
  isAlarmPlaying = false;

  if (pulseTimer) {
    clearInterval(pulseTimer);
    pulseTimer = null;
  }

  if (fallbackAudio) {
    try {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
    } catch {}
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
};

let blockedListener: ((blocked: boolean) => void) | null = null;
export const registerAutoplayBlockedListener = (cb: (blocked: boolean) => void) => {
  blockedListener = cb;
};

