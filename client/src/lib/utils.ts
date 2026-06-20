import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function triggerReward() {
  // 1. Haptic Feedback (Vibration)
  // Pattern: Extremely short, subtle tap for subconscious physical feedback
  if (navigator.vibrate) {
    navigator.vibrate(10); // 10ms micro-tap
  }

  // 2. Audio Feedback: The "Hooked" micro-interaction click.
  // Persuasive design requires the sound to be immediate, highly subtle, and non-intrusive.
  // We use a "soft water drop" or "organic click" (rapid pitch and volume decay)
  // so it provides closure without causing user fatigue.
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    
    // Attempt to resume audio context (fixes autoplay issues on some mobile browsers)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    
    // Rapid pitch sweep downwards creates an organic "pop" or "click" texture
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);

    // Very sharp, brief volume envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.005); // near-instant attack
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05); // rapid decay

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);

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
  // A light, satisfying confirmation ripple
  if (navigator.vibrate) {
    navigator.vibrate([15, 30, 20]);
  }

  // 2. Audio Feedback: The "Variable Reward" (Nir Eyal's Hooked).
  // A delightful, resolving micro-chime that gives a rush of completion without being annoying.
  // We use a clean, high-pitched two-note major interval (Major Third) for psychological closure.
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const playTone = (freq: number, startTime: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine'; // Pure bell-like tone
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      // Soft attack, smooth exponential decay
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // A sparkling, subtle two-note resolution (D6 -> F#6)
    playTone(1174.66, 0, 0.15, 0.2); // D6, fast
    playTone(1479.98, 0.08, 0.35, 0.25); // F#6 (Major third up), rings out slightly longer

    // Cleanup resources
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    }, 500);

  } catch (error) {
    console.error("Audio feedback failed", error);
  }
}
