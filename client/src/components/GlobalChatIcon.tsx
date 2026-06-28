import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { GlobalChatDialog } from './GlobalChatDialog';
import { Button } from './ui/button';

interface GlobalChatIconProps {
    className?: string;
}

export function GlobalChatIcon({ className }: GlobalChatIconProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(true)}
                className={`text-white/80 hover:text-white hover:bg-white/10 ${className || ''}`}
                aria-label="Open Global Chat"
            >
                <MessageCircle className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Team Chat</span>
            </Button>

            <GlobalChatDialog
                open={open}
                onOpenChange={setOpen}
            />
        </>
    );
}
