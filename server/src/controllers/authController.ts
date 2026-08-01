import { Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  // Login with username and PIN
  static async login(req: AuthRequest, res: Response) {
    try {
      const { username, pin } = req.body;

      if (!username || !pin) {
        return res.status(400).json({ error: 'Username and PIN are required' });
      }

      if (pin.length !== 6) {
        return res.status(400).json({ error: 'PIN must be 6 digits' });
      }

      const user = await User.findOne({ username });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPin = await user.comparePin(pin);
      if (!isValidPin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '14d' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          role: user.role,
          profileImage: user.profileImage
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // Get current user info based on token
  static async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        profileImage: user.profileImage
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  }
}
