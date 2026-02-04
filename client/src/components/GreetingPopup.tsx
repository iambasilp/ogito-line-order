
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Sunrise, Flame, ArrowRight } from 'lucide-react';

export const GreetingPopup: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const [open, setOpen] = useState(false);
    const [greeting, setGreeting] = useState('');
    const [message, setMessage] = useState('');
    const [Icon, setIcon] = useState<any>(Sun);
    const [streak, setStreak] = useState(1);
    const [showStreakAnimation, setShowStreakAnimation] = useState(false);

    useEffect(() => {
        // Only show for non-admin users (salesforce)
        if (!user || isAdmin) return;

        const checkGreeting = () => {
            const today = new Date().toLocaleDateString();
            // Use user.id if available, fallback to username if not (type safety)
            const userId = user.id || user.username;

            const lastGreetingKey = `lastGreeting_${userId}`;
            const lastGreetingDate = localStorage.getItem(lastGreetingKey);

            // If we haven't shown the greeting today
            if (lastGreetingDate !== today) {
                // --- 1. Calculate Streak ---
                const streakKey = `loginStreak_${userId}`;
                const lastStreakDateKey = `lastStreakDate_${userId}`;

                const currentStreak = parseInt(localStorage.getItem(streakKey) || '0', 10);
                const lastStreakDate = localStorage.getItem(lastStreakDateKey);

                let newStreak = 1;

                if (lastStreakDate) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toLocaleDateString();

                    if (lastStreakDate === yesterdayStr) {
                        // Logged in yesterday -> Increment streak
                        newStreak = currentStreak + 1;
                    } else if (lastStreakDate === today) {
                        // Already updated streak today (maybe on another tab), keep it
                        newStreak = currentStreak;
                    } else {
                        // Broken chain -> Reset to 1
                        newStreak = 1;
                    }
                }

                setStreak(newStreak);
                // Delay animation slightly for effect
                setTimeout(() => setShowStreakAnimation(true), 500);

                // --- 2. Determines Greeting (Behavioral Priming) ---
                const hour = new Date().getHours();
                let greetingText = '';
                let msg = '';
                let icon = Sun;

                // Messaging focused on "Time Well Spent" and "Identity" (Atomic Habits)
                if (hour < 12) {
                    greetingText = 'Good Morning';
                    msg = "Ready to set the pace for today?"; // Priming for action
                    icon = Sunrise;
                } else if (hour < 17) {
                    greetingText = 'Good Afternoon';
                    msg = 'Keep the momentum going strong.'; // Reinforcing consistency
                    icon = Sun;
                } else {
                    greetingText = 'Good Evening';
                    msg = 'Great work today. Rest up for tomorrow.'; // Closing the loop
                    icon = Moon;
                }

                setGreeting(greetingText);
                setMessage(msg);
                setIcon(icon);
                setOpen(true);
            }
        };

        checkGreeting();
    }, [user, isAdmin]);

    const handleClose = () => {
        if (user) {
            const today = new Date().toLocaleDateString();
            const userId = user.id || user.username;

            // Save state to prevent showing again today
            localStorage.setItem(`lastGreeting_${userId}`, today);

            // Update streak data
            localStorage.setItem(`loginStreak_${userId}`, streak.toString());
            localStorage.setItem(`lastStreakDate_${userId}`, today);
        }
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm p-0 overflow-hidden">
                {/* Decorative Header Bar */}
                <div className="h-2 w-full bg-gradient-to-r from-orange-400 to-red-500" />

                <div className="p-6 pb-8">
                    <DialogHeader className="flex flex-col items-center gap-6">

                        {/* Streak Indicator (Reward) */}
                        <div className={`
              relative flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100
              transition-all duration-700 ease-out transform
              ${showStreakAnimation ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'}
            `}>
                            <div className="relative">
                                <Flame className={`h-5 w-5 text-orange-500 ${streak > 1 ? 'animate-pulse' : ''} fill-orange-500`} />
                                {streak > 3 && (
                                    <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-ping" />
                                )}
                            </div>
                            <span className="font-bold text-orange-700 text-sm tracking-wide">
                                {streak} Day Streak
                            </span>
                        </div>

                        {/* Main Greeting */}
                        <div className="text-center space-y-2">
                            <div className="mx-auto w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-2 shadow-sm">
                                <Icon className="h-6 w-6 text-gray-700" />
                            </div>
                            <DialogTitle className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                {greeting}, {user?.name?.split(' ')[0] || user?.username}!
                            </DialogTitle>
                            <p className="text-gray-500 text-lg font-medium leading-relaxed max-w-[280px] mx-auto">
                                {message}
                            </p>
                        </div>
                    </DialogHeader>

                    <DialogFooter className="mt-8 flex justify-center sm:justify-center">
                        <Button
                            onClick={handleClose}
                            className="w-full sm:w-auto min-w-[200px] bg-gray-900 hover:bg-black text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                        >
                            <span className="mr-2">I'm Ready</span>
                            <ArrowRight className="h-5 w-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};
