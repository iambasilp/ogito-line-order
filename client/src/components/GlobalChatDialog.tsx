import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { MessageSquare, Send, X, Smile, Users } from 'lucide-react';
import { globalMessageApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from './ThemeProvider';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export interface IGlobalMessage {
    _id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    createdAt: string;
}

interface GlobalChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GlobalChatDialog({ open, onOpenChange }: GlobalChatDialogProps) {
    const [messages, setMessages] = useState<IGlobalMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const { theme } = useTheme();

    const fetchMessages = async () => {
        try {
            const res = await globalMessageApi.list();
            setMessages(res.data);
        } catch (err) {
            console.error('Failed to fetch global messages', err);
        }
    };

    useEffect(() => {
        if (open) {
            fetchMessages();
            // Start polling when open
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [open]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (open) {
            const timeoutId = setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [open, messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSubmitting(true);
        setShowEmojiPicker(false);
        try {
            const res = await globalMessageApi.create(newMessage);
            // Optimistic update
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send global message', error);
        } finally {
            setSubmitting(false);
        }
    };

    const onEmojiClick = (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="
                w-[95%] sm:w-full h-auto max-h-[85dvh] sm:max-h-[85vh] sm:max-w-md 
                flex flex-col p-0 gap-0 overflow-hidden rounded-lg shadow-xl mb-4 sm:mb-0
            ">
                {/* Header */}
                <DialogHeader className="px-4 py-3 border-b bg-muted/30">
                    <DialogTitle className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 text-base sm:text-lg">
                            <Users className="h-5 w-5 text-primary" />
                            <span>Global Chat</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full ml-1"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Message List */}
                <div 
                    className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[50vh] sm:min-h-[400px] relative"
                    style={{ 
                        backgroundColor: theme === 'dark' ? '#0b141a' : '#e5ddd5',
                        backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
                        backgroundBlendMode: theme === 'dark' ? 'multiply' : 'overlay'
                    }}
                >
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <div className="bg-card text-card-foreground/80 backdrop-blur-sm p-4 rounded-full mb-4 shadow-sm border border-white/50">
                                <MessageSquare className="h-12 w-12 opacity-20 text-emerald-600" />
                            </div>
                            <p className="text-sm font-bold text-foreground bg-card text-card-foreground/60 backdrop-blur-sm px-4 py-1 rounded-full border border-white/40 shadow-sm">
                                Say hello to everyone!
                            </p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isOwnMessage = user?.id === msg.senderId;

                            return (
                                <div key={msg._id || idx} className={`flex flex-col gap-1 max-w-[85%] ${isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className={`text-[10px] font-bold ${msg.senderRole === 'admin' ? 'text-red-500' : 'text-emerald-600'}`}>{msg.senderName}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div
                                        className={`relative p-2.5 text-sm shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] max-w-full ${
                                            isOwnMessage
                                            ? 'bg-[#dcf8c6] dark:bg-[#005c4b] border-none rounded-lg rounded-tr-none text-foreground self-end'
                                            : 'bg-card text-card-foreground border-none rounded-lg rounded-tl-none text-foreground self-start'
                                        }`}
                                    >
                                        <div className={`absolute top-0 w-3 h-3 ${
                                            isOwnMessage 
                                            ? '-right-2.5 border-l-[10px] border-l-[#dcf8c6] dark:border-l-[#005c4b] border-b-[10px] border-b-transparent' 
                                            : '-left-2.5 border-r-[10px] border-r-white dark:border-r-card border-b-[10px] border-b-transparent'
                                        }`} />

                                        <p className="whitespace-pre-wrap leading-normal break-words pr-1">{msg.text}</p>
                                        
                                        <div className="flex items-center justify-end gap-1.5 -mt-0.5 ml-8 h-4 overflow-hidden">
                                            <span className="text-[9px] text-muted-foreground font-medium whitespace-nowrap">
                                                {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Footer Input */}
                <div className="p-2 pb-4 bg-[#f0f2f5] dark:bg-[#111b21] border-t dark:border-border mt-auto">
                    <form onSubmit={handleSubmit} className="flex w-full gap-2 items-end max-w-full">
                        <div className="flex-1 flex items-end bg-card text-card-foreground rounded-2xl shadow-sm border border-border/50 min-h-[44px] px-2 py-1 gap-1">
                            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-full text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 shrink-0"
                                    >
                                        <Smile className="h-6 w-6" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent 
                                    side="top" 
                                    align="start" 
                                    className="p-0 border-none shadow-xl rounded-xl overflow-hidden mb-2"
                                    sideOffset={10}
                                >
                                    <EmojiPicker 
                                        onEmojiClick={onEmojiClick}
                                        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                                        emojiStyle={EmojiStyle.NATIVE}
                                        width={300}
                                        height={350}
                                        searchPlaceholder="Search emoji..."
                                        previewConfig={{ showPreview: false }}
                                        skinTonesDisabled
                                    />
                                </PopoverContent>
                            </Popover>

                            <textarea
                                className="flex-1 min-w-0 min-h-[36px] max-h-[150px] bg-transparent px-2 py-2 text-sm focus:outline-none resize-none leading-tight"
                                placeholder="Type a message to everyone"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                maxLength={1000}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                                disabled={submitting}
                                rows={1}
                            />
                        </div>
                        <Button
                            type="submit"
                            size="icon"
                            disabled={submitting || !newMessage.trim()}
                            className="h-11 w-11 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-md text-white transition-all active:scale-95"
                        >
                            <Send className="h-5 w-5 ml-0.5" />
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
