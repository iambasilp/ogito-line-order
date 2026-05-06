import Notification from '../models/Notification';
import User from '../models/User';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_MAILTO || 'mailto:admin@ogito.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export const createNotification = async (params: {
    recipient: string;
    sender: string;
    title: string;
    message: string;
    type: 'order' | 'receipt' | 'message' | 'system';
    relatedId?: string;
}) => {
    try {
        const sendPush = async (username: string) => {
            const user = await User.findOne({ username });
            if (user && user.pushSubscriptions && user.pushSubscriptions.length > 0) {
                const payload = JSON.stringify({
                    title: params.title,
                    body: params.message,
                    data: {
                        url: '/',
                        type: params.type,
                        relatedId: params.relatedId
                    }
                });

                const subscriptionsToRemove: string[] = [];

                await Promise.all(user.pushSubscriptions.map(async (sub) => {
                    try {
                        await webpush.sendNotification(
                            {
                                endpoint: sub.endpoint,
                                keys: {
                                    p256dh: sub.keys.p256dh,
                                    auth: sub.keys.auth
                                }
                            },
                            payload
                        );
                    } catch (error: any) {
                        if (error.statusCode === 404 || error.statusCode === 410) {
                            // Subscription expired or invalid
                            subscriptionsToRemove.push(sub.endpoint);
                        } else {
                            console.error('Push notification error:', error);
                        }
                    }
                }));

                if (subscriptionsToRemove.length > 0) {
                    await User.updateOne(
                        { _id: user._id },
                        { $pull: { pushSubscriptions: { endpoint: { $in: subscriptionsToRemove } } } }
                    );
                }
            }
        };

        // If recipient is 'admin', notify all admins
        if (params.recipient === 'admin') {
            const admins = await User.find({ role: 'admin' });
            const notifications = admins.map(admin => ({
                ...params,
                recipient: admin.username
            }));
            await Notification.insertMany(notifications);
            
            // Send push to each admin
            await Promise.all(admins.map(admin => sendPush(admin.username)));
        } else {
            const notification = new Notification(params);
            await notification.save();
            await sendPush(params.recipient);
        }
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};
