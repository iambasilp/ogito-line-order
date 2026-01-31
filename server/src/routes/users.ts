import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { ROLES } from '../config/constants';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await User.find().select('-pin').sort({ username: 1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ error: 'Username and PIN are required' });
    }

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Admin can only create sales users, not other admins
    // PIN will be automatically hashed by the pre-save hook
    const user = new User({
      username,
      pin,
      role: ROLES.USER
    });

    await user.save();

    res.status(201).json({
      id: user._id,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user PIN (admin only)
router.put('/:id/pin', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
    }

    // Hash the new PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { pin: hashedPin },
      { new: true }
    ).select('-pin');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'PIN updated successfully', user });
  } catch (error) {
    console.error('Update PIN error:', error);
    res.status(500).json({ error: 'Failed to update PIN' });
  }
});

export default router;
