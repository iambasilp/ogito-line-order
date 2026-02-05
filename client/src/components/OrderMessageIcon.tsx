import { useState, useMemo } from 'react';
import { MessageSquare, MessageCircle } from 'lucide-react';
import { Tooltip } from './ui/tooltip';
import { OrderMessageDialog } from './OrderMessageDialog';

interface OrderMessage {
    _id?: string;
    text: string;
    role: 'admin' | 'sales';
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    createdBy: string;
}

interface OrderMessageIconProps {
    orderId: string;
    orderCustomer: string;
    messages?: OrderMessage[];
    onUpdate: () => void;
}

export function OrderMessageIcon({ orderId, orderCustomer, messages = [], onUpdate }: OrderMessageIconProps) {
    const [open, setOpen] = useState(false);

    // Memoize derived state to prevent expensive recalculations during table scroll
    const { hasMessages, hasPending, latestMessage } = useMemo(() => {
        const hasMessages = messages && messages.length > 0;
        const hasPending = messages.some(m => m.status === 'pending');
        const latestMessage = hasMessages ? messages[messages.length - 1] : null;
        return { hasMessages, hasPending, latestMessage };
    }, [messages]);

    const getIcon = () => {
        if (!hasMessages) {
            return (
                <div className="relative group cursor-pointer p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                    <MessageSquare className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
            );
        }

        if (hasPending) {
            return (
                <div className="relative group cursor-pointer p-1.5 rounded-full bg-red-50 hover:bg-red-100 transition-colors">
                    <MessageCircle className="h-4 w-4 text-red-500 hover:text-red-600 transition-colors" />
                    <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-600 border-2 border-white rounded-full animate-pulse z-10" />
                </div>
            );
        }

        return (
            <div className="relative group cursor-pointer p-1.5 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors">
                <MessageCircle className="h-4 w-4 text-blue-500 hover:text-blue-600 transition-colors" />
            </div>
        );
    };

    // Tooltip Content - Lightweight preview
    const tooltipContent = hasMessages && latestMessage ? (
        <div className="w-64 space-y-2">
            <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                <span>{latestMessage.createdBy}</span>
                <span>{new Date(latestMessage.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-gray-100 line-clamp-2 leading-relaxed">
                {latestMessage.text}
            </p>
            <div className="flex justify-between items-center pt-1 border-t border-white/10 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${latestMessage.status === 'approved' ? 'bg-green-900/50 text-green-300' :
                    latestMessage.status === 'rejected' ? 'bg-red-900/50 text-red-300' :
                        'bg-yellow-900/50 text-yellow-300'
                    }`}>
                    {latestMessage.status}
                </span>
                <span className="text-[10px] text-gray-500 italic">Click to view all</span>
            </div>
        </div>
    ) : (
        <span className="text-xs">Add a message or change request</span>
    );

    return (
        <>
            <div onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(true);
            }}>
                <Tooltip content={tooltipContent} delay={400}>
                    {getIcon()}
                </Tooltip>
            </div>

            {/* Render Dialog only when open to save resources */}
            {open && (
                <OrderMessageDialog
                    orderId={orderId}
                    orderCustomer={orderCustomer}
                    messages={messages}
                    open={open}
                    onOpenChange={setOpen}
                    onUpdate={onUpdate}
                />
            )}
        </>
    );
}
