import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

export const subscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { subscription, deviceType } = req.body;
        const user = await User.findById(req.user!.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.pushSubscriptions) {
            user.pushSubscriptions = [];
        }

        // Check if subscription already exists
        const exists = user.pushSubscriptions.find(s => s.endpoint === subscription.endpoint);
        if (!exists) {
            user.pushSubscriptions.push({
                ...subscription,
                deviceType,
                lastUsed: new Date()
            });
            await user.save();
        } else {
            // Update last used
            exists.lastUsed = new Date();
            await user.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
};

export const unsubscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { endpoint } = req.body;
        const user = await User.findById(req.user!.id);
        
        if (user && user.pushSubscriptions) {
            user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== endpoint);
            await user.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
};
