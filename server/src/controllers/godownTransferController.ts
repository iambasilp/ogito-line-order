import { Request, Response } from 'express';
import GodownTransfer from '../models/GodownTransfer';

export const godownTransferController = {
  // Get all transfers
  getAllTransfers: async (req: Request, res: Response) => {
    try {
      // Validate secret password
      const password = req.headers['x-godown-password'];
      if (password !== '483444') {
        return res.status(401).json({ error: 'Unauthorized: Invalid godown password' });
      }

      const transfers = await GodownTransfer.find().sort({ date: -1, dispatchTime: -1 }).populate('createdBy', 'name username');
      res.json(transfers);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch transfers', details: error.message });
    }
  },

  // Create a new transfer
  createTransfer: async (req: Request, res: Response) => {
    try {
      const password = req.headers['x-godown-password'];
      if (password !== '483444') {
        return res.status(401).json({ error: 'Unauthorized: Invalid godown password' });
      }

      const admin = (req as any).user;
      
      const newTransfer = new GodownTransfer({
        ...req.body,
        createdBy: admin._id
      });

      await newTransfer.save();
      res.status(201).json(newTransfer);
    } catch (error: any) {
      res.status(400).json({ error: 'Failed to create transfer', details: error.message });
    }
  },

  // Update a transfer (like mark as delivered)
  updateTransfer: async (req: Request, res: Response) => {
    try {
      const password = req.headers['x-godown-password'];
      if (password !== '483444') {
        return res.status(401).json({ error: 'Unauthorized: Invalid godown password' });
      }

      const { id } = req.params;
      const updatedTransfer = await GodownTransfer.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      
      if (!updatedTransfer) {
        return res.status(404).json({ error: 'Transfer not found' });
      }
      
      res.json(updatedTransfer);
    } catch (error: any) {
      res.status(400).json({ error: 'Failed to update transfer', details: error.message });
    }
  }
};
