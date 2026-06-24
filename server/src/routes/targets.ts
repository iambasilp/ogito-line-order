import express from 'express';
import { TargetsController } from '../controllers/targetsController';
import { authenticate, requireAdmin, requireAdminOrCeo } from '../middleware/auth';
import Target from '../models/Target';

const router = express.Router();

// Get all targets (admin only)
router.get('/', authenticate, requireAdminOrCeo, TargetsController.getTargets);

// Create or update target (admin only)
router.post('/', authenticate, requireAdmin, TargetsController.setTarget);

// Get my target for a specific month (any authenticated user)
router.get('/my-target', authenticate, async (req: any, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });
    
    const target = await Target.findOne({ username: req.user.username.toLowerCase(), month });
    res.json({ target: target ? target.target : 0 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch target' });
  }
});

export default router;
