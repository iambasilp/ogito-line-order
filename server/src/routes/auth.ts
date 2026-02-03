import express from 'express';
import { AuthController } from '../controllers/authController';

const router = express.Router();

// Login with username and PIN
router.post('/login', AuthController.login);

export default router;
