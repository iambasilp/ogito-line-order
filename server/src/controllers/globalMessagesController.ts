import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import GlobalMessage from '../models/GlobalMessage';

export class GlobalMessagesController {
  
  // Get latest 100 global messages
  static async getMessages(req: AuthRequest, res: Response) {
    try {
      const messages = await GlobalMessage.find()
        .sort({ createdAt: -1 }) // Get latest messages
        .limit(100);
      
      // Reverse so they are in chronological order for the client
      res.json(messages.reverse());
    } catch (error) {
      console.error('Fetch global messages error:', error);
      res.status(500).json({ error: 'Failed to fetch global messages' });
    }
  }

  // Create a new global message
  static async createMessage(req: AuthRequest, res: Response) {
    try {
      const { text } = req.body;

      if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Message text is required' });
      }

      if (text.length > 1000) {
        return res.status(400).json({ error: 'Message text must not exceed 1000 characters' });
      }

      const message = new GlobalMessage({
        text: text.trim(),
        senderId: req.user!.id,
        senderName: req.user!.username,
        senderRole: req.user!.role
      });

      await message.save();

      // We could add web push notifications here if desired, 
      // but a global chat is often just polled or uses websockets.

      res.status(201).json(message);
    } catch (error) {
      console.error('Create global message error:', error);
      res.status(500).json({ error: 'Failed to create global message' });
    }
  }
}
