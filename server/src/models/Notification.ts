import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    recipient: string; // username
    sender: string;    // username
    title: string;
    message: string;
    type: 'order' | 'receipt' | 'message' | 'system';
    relatedId?: string; // e.g., orderId
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    recipient: { type: String, required: true, index: true },
    sender: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['order', 'receipt', 'message', 'system'], default: 'system' },
    relatedId: { type: String },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Auto-delete notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
