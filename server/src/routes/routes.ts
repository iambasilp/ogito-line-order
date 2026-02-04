import express from 'express';
import { RoutesController } from '../controllers/routesController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all routes (accessible to all authenticated users)
router.get('/', authenticate, RoutesController.getAllRoutes);

// Get single route
router.get('/:id', authenticate, RoutesController.getRouteById);

// Get route statistics
router.get('/:id/stats', authenticate, requireAdmin, RoutesController.getRouteStats);

// Create route (admin only)
router.post('/', authenticate, requireAdmin, RoutesController.createRoute);

// Update route (admin only)
router.put('/:id', authenticate, requireAdmin, RoutesController.updateRoute);

// Delete route (admin only)
router.delete('/:id', authenticate, requireAdmin, RoutesController.deleteRoute);

export default router;
