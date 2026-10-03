import { Request, Response } from 'express';
import GodownTransfer from '../models/GodownTransfer';
import Godown from '../models/Godown';

export const godownTransferController = {
  // --- Godown Master Data ---
  getGodowns: async (req: Request, res: Response) => {
    try {
      const godowns = await Godown.find().sort({ name: 1 });
      res.json(godowns);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch godowns', details: error.message });
    }
  },

  createGodown: async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const newGodown = new Godown({ name });
      await newGodown.save();
      res.status(201).json(newGodown);
    } catch (error: any) {
      res.status(400).json({ error: 'Failed to create godown', details: error.message });
    }
  },

  updateGodown: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const updatedGodown = await Godown.findByIdAndUpdate(id, { name }, { new: true });
      res.json(updatedGodown);
    } catch (error: any) {
      res.status(400).json({ error: 'Failed to update godown', details: error.message });
    }
  },

  deleteGodown: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await Godown.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: 'Failed to delete godown', details: error.message });
    }
  },

  // --- Transfers ---
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
        createdBy: admin.id
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
  },

  deleteTransfer: async (req: Request, res: Response) => {
    try {
      const password = req.headers['x-godown-password'];
      if (password !== '483444') {
        return res.status(401).json({ error: 'Unauthorized: Invalid godown password' });
      }

      const { id } = req.params;
      const deletedTransfer = await GodownTransfer.findByIdAndDelete(id);
      
      if (!deletedTransfer) {
        return res.status(404).json({ error: 'Transfer not found' });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: 'Failed to delete transfer', details: error.message });
    }
  }
};
