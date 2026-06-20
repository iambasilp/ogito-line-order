import express from 'express';
import { AiController } from '../controllers/aiController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.post('/insights', authenticate, requireAdmin, AiController.getInsights);

export default router;
