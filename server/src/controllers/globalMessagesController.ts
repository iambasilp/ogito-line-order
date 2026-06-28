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
        senderRole: req.user!.role,
        status: 'pending'
      });

      await message.save();

      res.status(201).json(message);
    } catch (error) {
      console.error('Create global message error:', error);
      res.status(500).json({ error: 'Failed to create global message' });
    }
  }

  // Edit a global message
  static async editMessage(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { text } = req.body;

      if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Message text is required' });
      }

      if (text.length > 1000) {
        return res.status(400).json({ error: 'Message text must not exceed 1000 characters' });
      }

      const message = await GlobalMessage.findById(id);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Only the sender or an admin can edit
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'ceo';
      if (message.senderId.toString() !== req.user!.id && !isAdmin) {
        return res.status(403).json({ error: 'Not authorized to edit this message' });
      }

      // Can only edit if pending
      if (message.status !== 'pending' && !isAdmin) {
        return res.status(400).json({ error: 'Cannot edit message after it has been reviewed' });
      }

      message.text = text.trim();
      await message.save();

      res.json(message);
    } catch (error) {
      console.error('Edit global message error:', error);
      res.status(500).json({ error: 'Failed to edit global message' });
    }
  }

  // Delete a global message
  static async deleteMessage(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const message = await GlobalMessage.findById(id);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Only the sender or an admin can delete
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'ceo';
      if (message.senderId.toString() !== req.user!.id && !isAdmin) {
        return res.status(403).json({ error: 'Not authorized to delete this message' });
      }

      // Can only delete if pending (unless admin)
      if (message.status !== 'pending' && !isAdmin) {
        return res.status(400).json({ error: 'Cannot delete message after it has been reviewed' });
      }

      await message.deleteOne();
      res.json({ success: true });
    } catch (error) {
      console.error('Delete global message error:', error);
      res.status(500).json({ error: 'Failed to delete global message' });
    }
  }

  // Update message status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'ceo';
      if (!isAdmin) {
        return res.status(403).json({ error: 'Not authorized to update message status' });
      }

      const message = await GlobalMessage.findById(id);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      message.status = status;
      await message.save();

      res.json(message);
    } catch (error) {
      console.error('Update global message status error:', error);
      res.status(500).json({ error: 'Failed to update message status' });
    }
  }
}
