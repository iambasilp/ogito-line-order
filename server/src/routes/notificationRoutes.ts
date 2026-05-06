import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import Notification from '../models/Notification';
import { subscribe, unsubscribe } from '../controllers/pushController';

const router = Router();

// Push Subscription
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);

// Get notifications for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const notifications = await Notification.find({ recipient: req.user!.username })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user!.username },
            { isRead: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all as read
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        await Notification.updateMany(
            { recipient: req.user!.username, isRead: false },
            { isRead: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// Delete notification
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user!.username });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

export default router;
