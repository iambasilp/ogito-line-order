import { Request, Response } from 'express';
import { Cheque } from '../models/Cheque';

export class ChequesController {
  // Get all cheques with search and status filtering + stats
  static async getCheques(req: Request, res: Response) {
    try {
      const { search, status } = req.query;
      let query: any = {};

      if (status && status !== 'all' && status !== 'All') {
        query.status = status;
      }

      if (search) {
        const searchRegex = new RegExp(search as string, 'i');
        query.$or = [
          { customerName: searchRegex },
          { chequeNumber: searchRegex },
          { bankName: searchRegex }
        ];
      }

      // Fetch the filtered cheques, sorted newest received first
      const cheques = await Cheque.find(query).sort({ receivedDate: -1, createdAt: -1 });

      // Calculate aggregate stats for ALL cheques (ignoring search/status filters for the totals)
      // This way the top cards always show the grand totals.
      const allCheques = await Cheque.find();
      
      let totalAmount = 0;
      let pendingAmount = 0;
      let clearedAmount = 0;
      let bouncedAmount = 0;

      allCheques.forEach(c => {
        totalAmount += c.amount;
        if (c.status === 'Pending') pendingAmount += c.amount;
        if (c.status === 'Cleared') clearedAmount += c.amount;
        if (c.status === 'Bounced') bouncedAmount += c.amount;
      });

      res.json({
        cheques,
        summary: {
          totalCheques: allCheques.length,
          totalAmount,
          pendingAmount,
          clearedAmount,
          bouncedAmount
        }
      });
    } catch (error) {
      console.error('Error fetching cheques:', error);
      res.status(500).json({ error: 'Failed to fetch cheques' });
    }
  }

  // Create a new cheque
  static async createCheque(req: Request, res: Response) {
    try {
      const { customerName, chequeNumber, chequeDate, amount, bankName, receivedDate, status, bounceReason, remarks } = req.body;

      if (!customerName || !chequeNumber || !chequeDate || amount === undefined || !bankName || !receivedDate) {
         return res.status(400).json({ error: 'Missing required fields' });
      }

      const cheque = new Cheque({
        customerName,
        chequeNumber,
        chequeDate,
        amount,
        bankName,
        receivedDate,
        status: status || 'Pending',
        bounceReason: status === 'Bounced' ? bounceReason : undefined,
        remarks
      });

      await cheque.save();
      res.status(201).json(cheque);
    } catch (error) {
      console.error('Error creating cheque:', error);
      res.status(500).json({ error: 'Failed to create cheque' });
    }
  }

  // Update a cheque
  static async updateCheque(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Clear bounce reason if status is not Bounced
      if (updateData.status && updateData.status !== 'Bounced') {
        updateData.bounceReason = undefined;
      }

      const cheque = await Cheque.findByIdAndUpdate(id, updateData, { new: true });
      
      if (!cheque) {
        return res.status(404).json({ error: 'Cheque not found' });
      }
      
      res.json(cheque);
    } catch (error) {
      console.error('Error updating cheque:', error);
      res.status(500).json({ error: 'Failed to update cheque' });
    }
  }

  // Delete a cheque
  static async deleteCheque(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cheque = await Cheque.findByIdAndDelete(id);
      
      if (!cheque) {
        return res.status(404).json({ error: 'Cheque not found' });
      }
      
      res.json({ message: 'Cheque deleted successfully' });
    } catch (error) {
      console.error('Error deleting cheque:', error);
      res.status(500).json({ error: 'Failed to delete cheque' });
    }
  }
}
