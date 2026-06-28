import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MessageSquare, Send, X, Smile, Users, Edit2, Trash2, CheckCircle } from 'lucide-react';
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
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

const QUICK_PRODUCTS = [
    "9x26 Samosa",
    "8x25.4 Samosa",
    "5.6x19.6 Mini Samosa",
    "8x8 Spring Roll",
    "6x6 Spring Roll"
];

interface GlobalChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GlobalChatDialog({ open, onOpenChange }: GlobalChatDialogProps) {
    const [messages, setMessages] = useState<IGlobalMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'ceo';
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

    const handleEditSave = async (id: string) => {
        if (!editText.trim()) return;
        try {
            const res = await globalMessageApi.edit(id, editText);
            setMessages(prev => prev.map(m => m._id === id ? res.data : m));
            setEditingId(null);
            setEditText('');
        } catch (error) {
            console.error('Failed to edit message', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            await globalMessageApi.delete(id);
            setMessages(prev => prev.filter(m => m._id !== id));
        } catch (error) {
            console.error('Failed to delete message', error);
        }
    };

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        try {
            const res = await globalMessageApi.updateStatus(id, status);
            setMessages(prev => prev.map(m => m._id === id ? res.data : m));
        } catch (error) {
            console.error('Failed to update status', error);
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
                            const canEdit = isOwnMessage && msg.status === 'pending';
                            const canDelete = isAdmin || (isOwnMessage && msg.status === 'pending');
                            const isEditing = editingId === msg._id;

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

                                        {isEditing ? (
                                            <div className="flex flex-col gap-2 min-w-[200px]">
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="w-full p-2 text-sm border-none bg-black/5 dark:bg-white/5 text-foreground rounded resize-none focus:outline-none"
                                                    rows={3}
                                                    maxLength={1000}
                                                    autoFocus
                                                />
                                                <div className="flex gap-1 justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 text-xs hover:bg-black/5"
                                                        onClick={() => {
                                                            setEditingId(null);
                                                            setEditText('');
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-none"
                                                        onClick={() => handleEditSave(msg._id)}
                                                    >
                                                        Save
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap leading-normal break-words pr-1">{msg.text}</p>
                                        )}
                                        
                                        <div className="flex items-center justify-end gap-1.5 -mt-0.5 ml-8 h-4 overflow-hidden">
                                            <span className="text-[9px] text-muted-foreground font-medium whitespace-nowrap">
                                                {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                            </span>
                                            {msg.senderRole === 'admin' && (
                                                <div className="flex items-center">
                                                    <CheckCircle className={`h-3 w-3 ${msg.status === 'approved' ? 'text-blue-500 fill-blue-500/20' : 'text-muted-foreground'}`} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex items-center gap-2 mt-0.5 px-1">
                                        {msg.status && msg.status !== 'pending' && (
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] h-5 px-1.5 ${msg.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30' :
                                                    'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/30'
                                                    }`}
                                            >
                                                {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                                            </Badge>
                                        )}

                                        {!isEditing && (canEdit || canDelete) && (
                                            <div className="flex gap-1 ml-2">
                                                {canEdit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                        onClick={() => {
                                                            setEditingId(msg._id);
                                                            setEditText(msg.text);
                                                        }}
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                        onClick={() => handleDelete(msg._id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {isAdmin && msg.status === 'pending' && (
                                            <div className="flex gap-1 ml-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 text-[10px] text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                    onClick={() => handleStatusUpdate(msg._id, 'approved')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => handleStatusUpdate(msg._id, 'rejected')}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Footer Input */}
                <div className="p-2 pb-4 bg-[#f0f2f5] dark:bg-[#111b21] border-t dark:border-border mt-auto flex flex-col gap-2">
                    
                    {/* Quick Insert Products */}
                    <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
                        {QUICK_PRODUCTS.map((prod) => (
                            <Button
                                key={prod}
                                variant="outline"
                                size="sm"
                                className="whitespace-nowrap h-7 text-xs bg-white dark:bg-card border-border hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                onClick={() => setNewMessage(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + prod + ' ')}
                            >
                                {prod}
                            </Button>
                        ))}
                    </div>

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
