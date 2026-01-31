import express from 'express';
import Route from '../models/Route';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all active routes (accessible to all authenticated users)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const routes = await Route.find({ isActive: true }).select('name').sort({ name: 1 });
    res.json(routes);
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

export default router;
