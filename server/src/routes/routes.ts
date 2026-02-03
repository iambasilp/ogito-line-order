import express from 'express';
import { RoutesController } from '../controllers/routesController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get all active routes (accessible to all authenticated users)
router.get('/', authenticate, RoutesController.getAllRoutes);

export default router;
