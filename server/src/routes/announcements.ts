import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import Announcement from '../models/Announcement';

const router = express.Router();

// Get the active announcement
router.get('/active', authenticate, async (req, res) => {
  try {
    const announcement = await Announcement.findOne({ isActive: true }).sort({ createdAt: -1 });
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active announcement' });
  }
});

// Create a new announcement (Admin only)
router.post('/', authenticate, requireAdmin, async (req: any, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Deactivate all previous announcements
    await Announcement.updateMany({}, { isActive: false });

    const announcement = new Announcement({
      message,
      isActive: true,
      createdBy: req.user?.id
    });

    await announcement.save();
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Deactivate announcement (Admin only)
router.post('/deactivate', authenticate, requireAdmin, async (req: any, res) => {
  try {
    await Announcement.updateMany({}, { isActive: false });
    res.json({ success: true, message: 'All announcements deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate announcements' });
  }
});

export default router;
