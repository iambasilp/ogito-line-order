import express from 'express';
import { UsersController } from '../controllers/usersController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, UsersController.getAllUsers);

// Get sales users only (for dropdowns) - accessible to all authenticated users
router.get('/sales', authenticate, UsersController.getSalesUsers);

// Create user (admin only)
router.post('/', authenticate, requireAdmin, UsersController.createUser);

// Update user PIN (admin only)
router.put('/:id/pin', authenticate, requireAdmin, UsersController.updateUserPin);

export default router;
