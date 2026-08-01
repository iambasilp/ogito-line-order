import express from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Login with username and PIN
router.post('/login', AuthController.login);

// Get current user info (for syncing session across devices)
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;
