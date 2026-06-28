import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { GlobalChatDialog } from './GlobalChatDialog';
import { Button } from './ui/button';
import { globalMessageApi } from '@/lib/api';

interface GlobalChatIconProps {
    className?: string;
}

export function GlobalChatIcon({ className }: GlobalChatIconProps) {
    const [open, setOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const checkUnread = async () => {
            if (open) return;
            try {
                const res = await globalMessageApi.list();
                const messages = res.data;
                if (messages.length > 0) {
                    const lastRead = localStorage.getItem('globalChatLastRead');
                    if (lastRead) {
                        const newMsgs = messages.filter((m: any) => new Date(m.createdAt) > new Date(lastRead));
                        setUnreadCount(newMsgs.length);
                    } else {
                        setUnreadCount(1); // Just show badge if never read
                    }
                }
            } catch (err) {}
        };

        checkUnread();
        const interval = setInterval(checkUnread, 10000);
        return () => clearInterval(interval);
    }, [open]);

    const handleOpen = () => {
        setOpen(true);
        setUnreadCount(0);
        localStorage.setItem('globalChatLastRead', new Date().toISOString());
    };

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={handleOpen}
                className={`relative text-white/80 hover:text-white hover:bg-white/10 ${className || ''}`}
                aria-label="Open Global Chat"
            >
                <div className="relative">
                    <MessageCircle className="h-5 w-5 sm:mr-2" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 sm:right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
                <span className="hidden sm:inline">Team Chat</span>
            </Button>

            <GlobalChatDialog
                open={open}
                onOpenChange={setOpen}
            />
        </>
    );
}
