import { Response } from 'express';
import Route from '../models/Route';
import Customer from '../models/Customer';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';

export class RoutesController {
  // Get all routes (with optional filter for active only)
  static async getAllRoutes(req: AuthRequest, res: Response) {
    try {
      const { activeOnly } = req.query;
      
      const query = activeOnly === 'true' ? { isActive: true } : {};
      const routes = await Route.find(query).sort({ name: 1 });
      
      res.json(routes);
    } catch (error) {
      console.error('Get routes error:', error);
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  }

  // Get single route
  static async getRouteById(req: AuthRequest, res: Response) {
    try {
      const route = await Route.findById(req.params.id);
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }
      res.json(route);
    } catch (error) {
      console.error('Get route error:', error);
      res.status(500).json({ error: 'Failed to fetch route' });
    }
  }

  // Create route (admin only)
  static async createRoute(req: AuthRequest, res: Response) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Route name is required' });
      }

      // Check if route already exists
      const existing = await Route.findOne({ name: name.toUpperCase() });
      if (existing) {
        return res.status(400).json({ error: 'Route already exists' });
      }

      const route = new Route({
        name: name.toUpperCase(),
        isActive: true
      });

      await route.save();
      res.status(201).json(route);
    } catch (error: any) {
      console.error('Create route error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Route already exists' });
      }
      res.status(500).json({ error: 'Failed to create route' });
    }
  }

  // Update route (admin only)
  static async updateRoute(req: AuthRequest, res: Response) {
    try {
      const { name } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name.toUpperCase();

      const route = await Route.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      res.json(route);
    } catch (error: any) {
      console.error('Update route error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Route name already exists' });
      }
      res.status(500).json({ error: 'Failed to update route' });
    }
  }

  // Delete route (admin only)
  static async deleteRoute(req: AuthRequest, res: Response) {
    try {
      const route = await Route.findById(req.params.id);
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      // Check if route is being used by customers
      const customersCount = await Customer.countDocuments({ route: route._id });
      if (customersCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete route "${route.name}". It is being used by ${customersCount} customer(s). Please reassign all customers to a different route first.` 
        });
      }

      // Check if route is being used by orders (extra safety)
      const ordersCount = await Order.countDocuments({ route: route._id });
      if (ordersCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete route "${route.name}". It is referenced in ${ordersCount} order(s).` 
        });
      }

      await Route.findByIdAndDelete(req.params.id);
      res.json({ message: 'Route deleted successfully' });
    } catch (error) {
      console.error('Delete route error:', error);
      res.status(500).json({ error: 'Failed to delete route' });
    }
  }

  // Get route statistics
  static async getRouteStats(req: AuthRequest, res: Response) {
    try {
      const routeId = req.params.id;

      const [customersCount, ordersCount] = await Promise.all([
        Customer.countDocuments({ route: routeId }),
        Order.countDocuments({ route: routeId })
      ]);

      res.json({
        customersCount,
        ordersCount
      });
    } catch (error) {
      console.error('Get route stats error:', error);
      res.status(500).json({ error: 'Failed to fetch route statistics' });
    }
  }
}
