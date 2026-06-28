import express from 'express';
import { authenticate } from '../middleware/auth';
import { GlobalMessagesController } from '../controllers/globalMessagesController';

const router = express.Router();

// Get all global messages (limited to 100)
router.get('/', authenticate, GlobalMessagesController.getMessages);

// Create a new global message
router.post('/', authenticate, GlobalMessagesController.createMessage);

export default router;
