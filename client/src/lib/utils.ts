import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function triggerReward() {
  // 1. Haptic Feedback (Vibration)
  // Pattern: Clear double pulse for a proper notification
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }

  // 2. Audio Feedback (Loud, clear notification ping)
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    
    // Attempt to resume audio context (fixes autoplay issues on some mobile browsers)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // A loud, classic double-ping (like a message arrival)
    // First ping
    playTone(880, 'sine', 0, 0.3, 0.5); // A5
    playTone(1760, 'triangle', 0, 0.3, 0.2); // A6 overtone
    
    // Second ping (higher)
    playTone(1108.73, 'sine', 0.15, 0.5, 0.5); // C#6
    playTone(2217.46, 'triangle', 0.15, 0.5, 0.2); // C#7 overtone

    // Cleanup resources
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    }, 1000);

  } catch (error) {
    // Silently fail if audio is not supported or blocked
    console.error("Audio feedback failed", error);
  }
}

export function triggerDeliveryReward() {
  // 1. Haptic Feedback (Success pattern)
  if (navigator.vibrate) {
    navigator.vibrate([30, 50, 40]); // Two quick, satisfying pulses
  }

  // 2. Audio Feedback (Scientifically proven rewarding ascending major chord/chime)
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const playChime = (freq: number, startTime: number, duration: number, maxGain = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Sine wave gives a pure, pleasant bell tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      // Envelope for a bell-like "ding"
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(maxGain, ctx.currentTime + startTime + 0.02); // Quick, soft attack
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration); // Smooth decay

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Ascending Major Triad interval provides strong psychological closure and reward
    // Notes: C6 (1046.5Hz) -> E6 (1318.51Hz) -> G6 (1567.98Hz)
    // The staggered starts create a very pleasing "ba-ding-ding" effect
    playChime(1046.50, 0, 0.4, 0.2);      // Base note
    playChime(1318.51, 0.1, 0.5, 0.2);    // Major third, short delay
    playChime(1567.98, 0.2, 0.8, 0.3);    // Perfect fifth, longer sustain

    // Cleanup resources
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    }, 1500);

  } catch (error) {
    console.error("Audio feedback failed", error);
  }
}
