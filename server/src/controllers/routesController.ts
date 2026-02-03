import { Response } from 'express';
import Route from '../models/Route';
import { AuthRequest } from '../middleware/auth';

export class RoutesController {
  // Get all active routes (accessible to all authenticated users)
  static async getAllRoutes(req: AuthRequest, res: Response) {
    try {
      const routes = await Route.find({ isActive: true }).select('name').sort({ name: 1 });
      res.json(routes);
    } catch (error) {
      console.error('Get routes error:', error);
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  }
}
