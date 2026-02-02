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
        const startValue = 0;
        const endValue = value;

        if (startValue === endValue) {
            setDisplayValue(endValue);
            return;
        }

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function (easeOutExpo)
            // 1 - Math.pow(2, -10 * progress) for a nice pop effect
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            const currentValue = startValue + (endValue - startValue) * easeProgress;

            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    // Round to integer for display if it's counting up, or let the formatter handle it
    // We pass the raw interpolated number to the formatter if custom formatting is needed,
    // but usually we want integers during the count.
    const formattedDisplay = formatValue(Math.floor(displayValue));

    return (
        <span className={className} style={style}>
            {formattedDisplay}
        </span>
    );
};

export default AnimatedNumber;
