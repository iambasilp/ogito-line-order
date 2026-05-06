import { Router, Response } from 'express';
import { AuthRequest, auth } from '../middleware/auth';
import Notification from '../models/Notification';
import { subscribe, unsubscribe } from '../controllers/pushController';

const router = Router();

// Push Subscription
router.post('/subscribe', auth, subscribe);
router.post('/unsubscribe', auth, unsubscribe);

// Get notifications for current user
router.get('/', auth, async (req: AuthRequest, res: Response) => {
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
router.patch('/:id/read', auth, async (req: AuthRequest, res: Response) => {
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
router.patch('/read-all', auth, async (req: AuthRequest, res: Response) => {
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
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user!.username });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

export default router;
