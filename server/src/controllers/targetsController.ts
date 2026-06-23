import { Request, Response } from 'express';
import Target from '../models/Target';
import User from '../models/User';

export class TargetsController {
  // Get targets (optionally filtered by month or username)
  static async getTargets(req: Request, res: Response) {
    try {
      const { month, username } = req.query;
      const filter: any = {};
      
      if (month) filter.month = month;
      if (username) filter.username = (username as string).toLowerCase();

      const targets = await Target.find(filter).sort({ month: -1, username: 1 });
      res.json(targets);
    } catch (error) {
      console.error('Failed to get targets:', error);
      res.status(500).json({ message: 'Failed to fetch targets' });
    }
  }

  // Set or update a target
  static async setTarget(req: Request, res: Response) {
    try {
      const { username, month, target } = req.body;

      if (!username || !month || target === undefined) {
        return res.status(400).json({ message: 'username, month, and target are required' });
      }

      // Verify user exists
      const user = await User.findOne({ username: username.toLowerCase() });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Upsert target
      const updatedTarget = await Target.findOneAndUpdate(
        { username: username.toLowerCase(), month },
        { target },
        { new: true, upsert: true, runValidators: true }
      );

      res.json(updatedTarget);
    } catch (error) {
      console.error('Failed to set target:', error);
      res.status(500).json({ message: 'Failed to set target' });
    }
  }
}
