import Notification from '../models/Notification';
import User from '../models/User';

export const createNotification = async (params: {
    recipient: string;
    sender: string;
    title: string;
    message: string;
    type: 'order' | 'receipt' | 'message' | 'system';
    relatedId?: string;
}) => {
    try {
        // If recipient is 'admin', notify all admins
        if (params.recipient === 'admin') {
            const admins = await User.find({ role: 'admin' });
            const notifications = admins.map(admin => ({
                ...params,
                recipient: admin.username
            }));
            await Notification.insertMany(notifications);
        } else {
            const notification = new Notification(params);
            await notification.save();
        }
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};
