import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, Trash2, Package, Receipt, MessageSquare, Info } from 'lucide-react';
import { notificationApi } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { triggerReward } from '@/lib/utils';

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
    const lastUnreadCount = useRef(0);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data } = await notificationApi.list();
            const newUnreadCount = data.filter((n: INotification) => !n.isRead).length;
            
            // Trigger haptic/audio feedback if unread count increases
            if (newUnreadCount > lastUnreadCount.current) {
                triggerReward();
            }
            lastUnreadCount.current = newUnreadCount;
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds for more "real-time" feel
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            lastUnreadCount.current = Math.max(0, lastUnreadCount.current - 1);
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            lastUnreadCount.current = 0;
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const isUnread = !notifications.find(n => n._id === id)?.isRead;
            await notificationApi.delete(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            if (isUnread) {
                lastUnreadCount.current = Math.max(0, lastUnreadCount.current - 1);
            }
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
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-muted/50 transition-colors">
                    <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'} transition-colors`} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                align="end" 
                className="w-[calc(100vw-2rem)] sm:w-80 p-0 overflow-hidden rounded-2xl border shadow-2xl z-[1000] bg-white/95 backdrop-blur-md"
                sideOffset={8}
            >
                <div className="flex items-center justify-between px-4 py-4 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold tracking-tight">Notifications</h3>
                        {unreadCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 rounded-full text-[10px]">{unreadCount} new</Badge>}
                    </div>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5 rounded-full"
                            onClick={handleMarkAllAsRead}
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                <div className="max-h-[min(450px,70dvh)] overflow-y-auto overscroll-contain">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <div className="bg-muted/30 p-4 rounded-full mb-4">
                                <Bell className="h-8 w-8 opacity-20" />
                            </div>
                            <p className="text-sm font-medium">All caught up!</p>
                            <p className="text-xs opacity-60">No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div 
                                key={n._id} 
                                className={`group relative flex gap-3 p-4 border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer ${!n.isRead ? 'bg-primary/[0.03]' : ''}`}
                                onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                            >
                                <div className={`mt-1 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${!n.isRead ? 'bg-white shadow-md ring-1 ring-black/[0.03]' : 'bg-muted/50'}`}>
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className={`text-sm leading-tight truncate ${!n.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                            {n.title}
                                        </p>
                                        {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5 leading-relaxed">
                                        {n.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/70 font-medium">
                                        {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="absolute right-2 top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600 active:bg-red-100"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="px-4 py-2.5 border-t bg-muted/5 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">
                            Showing last 50 updates
                        </p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
