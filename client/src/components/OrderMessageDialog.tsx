import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MessageSquare, Send, CheckCircle, XCircle, Clock, Edit2, Trash2, Save, X } from 'lucide-react';
import { orderMessageApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { IOrderMessage } from '@/types';

interface OrderMessageDialogProps {
    orderId: string;
    orderCustomer: string;
    messages: IOrderMessage[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
}

export function OrderMessageDialog({ orderId, orderCustomer, messages, open, onOpenChange, onUpdate }: OrderMessageDialogProps) {
    const [newMessage, setNewMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // Auto-scroll to bottom when messages change or dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [open, messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSubmitting(true);
        try {
            await orderMessageApi.create(orderId, newMessage);
            setNewMessage('');
            onUpdate();
        } catch (error) {
            console.error('Failed to send message', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (messageId: string, status: 'approved' | 'rejected') => {
        try {
            await orderMessageApi.updateStatus(orderId, messageId, status);
            onUpdate();
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handleEditStart = (msg: IOrderMessage) => {
        setEditingMessageId(msg._id);
        setEditText(msg.text);
    };

    const handleEditCancel = () => {
        setEditingMessageId(null);
        setEditText('');
    };

    const handleEditSave = async (messageId: string) => {
        if (!editText.trim()) return;

        try {
            await orderMessageApi.edit(orderId, messageId, editText);
            setEditingMessageId(null);
            setEditText('');
            onUpdate();
        } catch (error) {
            console.error('Failed to edit message', error);
        }
    };

    const handleDelete = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            await orderMessageApi.delete(orderId, messageId);
            onUpdate();
        } catch (error) {
            console.error('Failed to delete message', error);
        }
    };

    const sortedMessages = [...messages].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

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
                            <MessageSquare className="h-5 w-5 text-primary" />
                            <span>Change Requests</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-normal text-muted-foreground bg-white px-2 py-0.5 rounded border truncate max-w-[120px]">
                                {orderCustomer}
                            </span>
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 min-h-[20vh] sm:min-h-[300px]">
                    {sortedMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-60">
                            <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">No messages yet</p>
                            <p className="text-xs">Requests and notes will appear here</p>
                        </div>
                    ) : (
                        sortedMessages.map((msg, idx) => {
                            const isEditing = editingMessageId === msg._id;
                            const isOwnMessage = user?.id === msg.createdBy;
                            const canEdit = isOwnMessage && msg.status === 'pending';
                            const canDelete = (isOwnMessage || isAdmin) && msg.status === 'pending';

                            return (
                                <div key={idx} className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'admin' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className="text-[10px] font-bold text-gray-600">{msg.createdByUsername}</span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                            <Clock className="h-3 w-3" />
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div
                                        className={`relative p-3 text-sm border shadow-sm ${msg.role === 'admin'
                                            ? 'bg-blue-50 border-blue-100 rounded-2xl rounded-tr-sm text-blue-900'
                                            : 'bg-white border-gray-100 rounded-2xl rounded-tl-sm text-gray-900'
                                            }`}
                                    >
                                        {isEditing ? (
                                            <div className="flex flex-col gap-2">
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="w-full p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                    rows={3}
                                                    maxLength={1000}
                                                    autoFocus
                                                />
                                                <div className="flex gap-1 justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 text-xs"
                                                        onClick={handleEditCancel}
                                                    >
                                                        <X className="h-3 w-3 mr-1" />
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => handleEditSave(msg._id)}
                                                    >
                                                        <Save className="h-3 w-3 mr-1" />
                                                        Save
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                        )}
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex items-center gap-2 mt-0.5 px-1">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] h-5 px-1.5 ${msg.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                msg.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                }`}
                                        >
                                            {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                                        </Badge>

                                        {/* Edit/Delete Buttons for Message Creator */}
                                        {!isEditing && (canEdit || canDelete) && (
                                            <div className="flex gap-1 ml-2">
                                                {canEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-5 w-5 rounded-full p-0 hover:bg-blue-100 text-blue-600"
                                                        onClick={() => handleEditStart(msg)}
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-5 w-5 rounded-full p-0 hover:bg-red-100 text-red-600"
                                                        onClick={() => handleDelete(msg._id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {/* Admin Action Buttons */}
                                        {isAdmin && msg.status === 'pending' && (
                                            <div className="flex gap-1 ml-2 animate-in fade-in duration-300">
                                                <Button
                                                    size="sm"
                                                    className="h-6 w-6 rounded-full p-0 bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                                                    onClick={() => handleStatusUpdate(msg._id!, 'approved')}
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-6 w-6 rounded-full p-0 bg-red-100 hover:bg-red-200 text-red-700"
                                                    onClick={() => handleStatusUpdate(msg._id!, 'rejected')}
                                                    title="Reject"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
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
                <div className="p-3 bg-white border-t mt-auto">
                    <form onSubmit={handleSubmit} className="flex w-full gap-2 items-end">
                        <textarea
                            className="flex-1 min-w-0 min-h-[40px] max-h-[120px] rounded-lg border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-white transition-all resize-none"
                            placeholder="Type a request..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            disabled={submitting}
                            rows={1}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={submitting || !newMessage.trim()}
                            className="h-10 w-10 shrink-0 rounded-full"
                        >
                            <Send className="h-4 w-4 ml-0.5" />
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
