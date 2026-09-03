// Universal Mobile/Desktop Audio Alarm Manager with Autoplay Unlock & Synthesizer Fallback

let audioCtx: AudioContext | null = null;
let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenInterval: any = null;
let audioElement: HTMLAudioElement | null = null;
let isUnlocked = false;

// Unlock Audio on First User Interaction (Touch, Click, Key)
export const unlockAudio = () => {
  if (isUnlocked) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (!audioElement) {
      audioElement = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
      audioElement.loop = true;
      audioElement.volume = 1.0;
      audioElement.load();
    }

    isUnlocked = true;
    console.log('[Audio] Audio system unlocked successfully on user gesture');
  } catch (e) {
    console.warn('[Audio] Failed to unlock audio:', e);
  }
};

// Register universal one-time unlock listeners on page load
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
  const handleFirstInteraction = () => {
    unlockAudio();
    unlockEvents.forEach(evt => window.removeEventListener(evt, handleFirstInteraction));
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, handleFirstInteraction, { passive: true }));
}

// Start Synthesizer Siren (Reliable offline fallback)
const startSynthSiren = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (sirenOscillator) return;

    sirenOscillator = audioCtx.createOscillator();
    sirenGain = audioCtx.createGain();

    sirenOscillator.type = 'sawtooth';
    sirenOscillator.frequency.setValueAtTime(850, audioCtx.currentTime);

    sirenGain.gain.setValueAtTime(0.3, audioCtx.currentTime);

    sirenOscillator.connect(sirenGain);
    sirenGain.connect(audioCtx.destination);

    sirenOscillator.start();

    // Alternate frequency between 850Hz and 650Hz to create a loud emergency warble
    let high = true;
    sirenInterval = setInterval(() => {
      if (sirenOscillator && audioCtx) {
        const nextFreq = high ? 650 : 950;
        sirenOscillator.frequency.setTargetAtTime(nextFreq, audioCtx.currentTime, 0.08);
        high = !high;
      }
    }, 350);
  } catch (err) {
    console.warn('[Audio] Synth siren error:', err);
  }
};

// Stop Synthesizer Siren
const stopSynthSiren = () => {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (sirenOscillator) {
    try {
      sirenOscillator.stop();
      sirenOscillator.disconnect();
    } catch {}
    sirenOscillator = null;
  }
  if (sirenGain) {
    try {
      sirenGain.disconnect();
    } catch {}
    sirenGain = null;
  }
};

// Main Public Interface
export const startEmergencyAlarm = () => {
  unlockAudio();

  let mp3Playing = false;

  // 1. Try MP3 Alarm Sound
  try {
    if (!audioElement) {
      audioElement = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
      audioElement.loop = true;
    }
    audioElement.currentTime = 0;
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          mp3Playing = true;
        })
        .catch(err => {
          console.warn('[Audio] MP3 autoplay blocked or failed, using Synth siren fallback:', err);
          startSynthSiren();
        });
    }
  } catch (e) {
    startSynthSiren();
  }

  // Also start synth siren if mp3 is taking too long
  setTimeout(() => {
    if (!mp3Playing && !sirenOscillator) {
      startSynthSiren();
    }
  }, 500);

  // 2. Trigger Phone Vibration pattern
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([500, 250, 500, 250, 500, 250, 500]);
    } catch {}
  }
};

export const stopEmergencyAlarm = () => {
  if (audioElement) {
    try {
      audioElement.pause();
      audioElement.currentTime = 0;
    } catch {}
  }
  stopSynthSiren();

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
};
