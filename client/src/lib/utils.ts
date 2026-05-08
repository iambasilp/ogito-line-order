import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function triggerReward() {
  // 1. Haptic Feedback (Vibration)
  // Pattern: Very subtle, single soft pulse
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }

  // 2. Audio Feedback (Balanced, proper UI confirmation)
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // Oscillator for the tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Sound Design: A very clean, professional, short "tic" or "blip"
    // that is noticeable but completely unobtrusive.
    const now = ctx.currentTime;

    osc.type = 'sine';
    // Clean, medium pitch dropping rapidly to give structure to the sound
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

    // Envelope: Quick but rounded attack to prevent speaker "popping", fast decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.start(now);
    osc.stop(now + 0.04);

    // Cleanup resources
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    }, 100);

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
