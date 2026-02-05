import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    delay?: number; // Delay in ms, default 300ms like GitHub
    className?: string;
}

export function Tooltip({ content, children, delay = 300, className }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                // Calculate position (centered above)
                setCoords({
                    top: rect.top + window.scrollY - 8, // 8px spacing
                    left: rect.left + window.scrollX + rect.width / 2
                });
                setIsVisible(true);
            }
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="inline-block"
            >
                {children}
            </div>
            {isVisible && createPortal(
                <div
                    className={cn(
                        "fixed z-[9999] px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-md shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-150",
                        className
                    )}
                    style={{ top: coords.top, left: coords.left }}
                >
                    {content}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-900" />
                </div>,
                document.body
            )}
        </>
    );
}
