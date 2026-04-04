import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/authController';

const router = express.Router();

// Rate limit login: max 10 attempts per 15 minutes per IP
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Login with username and PIN
router.post('/login', loginRateLimit, AuthController.login);

export default router;
