import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Trash2, Package, Receipt, MessageSquare, Info } from 'lucide-react';
import { notificationApi } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface INotification {
    _id: string;
    title: string;
    message: string;
    type: 'order' | 'receipt' | 'message' | 'system';
    isRead: boolean;
    createdAt: string;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [open, setOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data } = await notificationApi.list();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await notificationApi.delete(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'order': return <Package className="h-4 w-4 text-blue-500" />;
            case 'receipt': return <Receipt className="h-4 w-4 text-emerald-500" />;
            case 'message': return <MessageSquare className="h-4 w-4 text-orange-500" />;
            default: return <Info className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-muted">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 overflow-hidden rounded-xl border shadow-2xl z-[1000]">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <h3 className="text-sm font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/5"
                            onClick={handleMarkAllAsRead}
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-50">
                            <Bell className="h-10 w-10 mb-2 opacity-20" />
                            <p className="text-xs">No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div 
                                key={n._id} 
                                className={`group relative flex gap-3 p-4 border-b last:border-0 hover:bg-muted/30 transition-colors ${!n.isRead ? 'bg-primary/[0.02]' : ''}`}
                            >
                                <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-white shadow-sm ring-1 ring-black/5' : 'bg-muted'}`}>
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className={`text-sm leading-tight truncate ${!n.isRead ? 'font-bold' : 'font-medium'}`}>
                                            {n.title}
                                        </p>
                                        {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                        {n.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="absolute right-2 top-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!n.isRead && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 rounded-full hover:bg-emerald-50 hover:text-emerald-600"
                                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n._id); }}
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 rounded-full hover:bg-red-50 hover:text-red-600"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t bg-muted/10 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            Showing last 50 notifications
                        </p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
