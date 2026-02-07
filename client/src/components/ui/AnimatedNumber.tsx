import React, { useEffect, useState } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    formatValue?: (value: number) => string | number;
    className?: string;
    style?: React.CSSProperties;
}


const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
    value,
    duration = 1000,
    formatValue = (v) => v,
    className,
    style
}) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let startValue = 0;
        const endValue = value;

        if (startValue === endValue) {
            setDisplayValue(endValue);
            return;
        }

        // Web Audio API Context
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        let ctx: AudioContext | null = new AudioContext();

        const playTick = () => {
            if (!ctx) return;
            try {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                // Short high-pitched tick
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, ctx.currentTime);

                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.05);
            } catch (e) {
                // Ignore audio errors
            }
        };

        let lastSoundTime = 0;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function (easeOutExpo)
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const currentValue = startValue + (endValue - startValue) * easeProgress;

            setDisplayValue(currentValue);

            // Play sound every 50ms while animating
            if (progress < 1) {
                if (currentTime - lastSoundTime > 60) { // Limit tick rate
                    playTick();
                    lastSoundTime = currentTime;
                }
                requestAnimationFrame(animate);
            } else {
                // Final satisfying "ding"
                if (ctx) {
                    try {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);

                        osc.frequency.setValueAtTime(1500, ctx.currentTime);
                        gain.gain.setValueAtTime(0.1, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

                        osc.start(ctx.currentTime);
                        osc.stop(ctx.currentTime + 0.4);
                    } catch (e) { }

                    // Cleanup
                    setTimeout(() => {
                        ctx?.close();
                        ctx = null;
                    }, 500);
                }
            }
        };

        requestAnimationFrame(animate);

        return () => {
            if (ctx && ctx.state !== 'closed') {
                ctx.close();
            }
        };
    }, [value, duration]);

    // Round to integer for display if it's counting up, or let the formatter handle it
    const formattedDisplay = formatValue(Math.floor(displayValue));

    return (
        <span className={className} style={style}>
            {formattedDisplay}
        </span>
    );
};

export default AnimatedNumber;
