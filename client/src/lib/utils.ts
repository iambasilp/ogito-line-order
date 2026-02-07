import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function triggerReward() {
  // 1. Haptic Feedback (Vibration)
  // Pattern: Short crisp vibration for mobile
  if (navigator.vibrate) {
    navigator.vibrate(15);
  }

  // 2. Audio Feedback (Pleasant "Pop" / "Ding")
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // Oscillator for the tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Sound Design: A pleasant high-pitched "pop"
    // Tristan Harris style: subtle, rewarding, not annoying

    // Starting frequency
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // High A

    // Envelope: Quick attack, short decay
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01); // Quick fade in
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3); // Smooth fade out

    osc.start(now);
    osc.stop(now + 0.3);

    // Create a secondary harmonic for richness
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, now); // Octave above
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.05, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc2.start(now);
    osc2.stop(now + 0.3);

    // Cleanup resources
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    }, 400);

  } catch (error) {
    // Silently fail if audio is not supported or blocked
    console.error("Audio feedback failed", error);
  }
}
