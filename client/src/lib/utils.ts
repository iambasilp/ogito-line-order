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
