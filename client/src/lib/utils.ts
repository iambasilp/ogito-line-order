import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function triggerReward() {
  // 1. Haptic Feedback (Vibration)
  // Two bright, positive pulses for a feeling of 'success'
  if (navigator.vibrate) {
    navigator.vibrate([30, 50, 40]);
  }

  // 2. Audio Feedback - Designed for Psychological Reward
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    const playNote = (freq: number, startTime: number, duration: number, type: OscillatorType, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      // Bright attack, smooth decay for a "bell" like resonance
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;

    // "Level Up / Cash Mined" arpeggio (C6 -> E6 -> G6)
    // Climbing notes naturally signal "increase", "success", or "accomplishment" psychologically
    playNote(1046.50, now, 0.15, 'sine', 0.08);       // C6
    playNote(1318.51, now + 0.08, 0.15, 'sine', 0.1); // E6
    playNote(1567.98, now + 0.16, 0.5, 'sine', 0.15); // G6 (Held longer for satisfying tail)

    // Cleanup resources after sound completes
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    }, 1000);

  } catch (error) {
    console.error("Audio feedback failed", error);
  }
}
