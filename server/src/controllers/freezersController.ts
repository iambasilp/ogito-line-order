import { Request, Response } from 'express';
import Freezer from '../models/Freezer';
import Order from '../models/Order';
import Customer from '../models/Customer';

export class FreezersController {
  // Get all freezers with populated data and dynamic Avg Monthly Sales
  static async getAllFreezers(req: Request, res: Response) {
    try {
      const freezers = await Freezer.find()
        .populate('customerId', 'name shopName')
        .populate('route', 'name')
        .sort({ createdAt: -1 });

      // Calculate Average Monthly Sales for installed freezers
      // We will look at orders from the last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const freezersWithSales = await Promise.all(freezers.map(async (freezer) => {
        const doc: any = freezer.toJSON();
        
        if (doc.customerId) {
          // Aggregate orders for this customer in the last 3 months
          const salesData = await Order.aggregate([
            { 
              $match: { 
                customerId: (freezer.customerId as any)._id,
                date: { $gte: threeMonthsAgo }
              } 
            },
            {
              $group: {
                _id: {
                  year: { $year: '$date' },
                  month: { $month: '$date' }
                },
                monthlyQty: { $sum: { $add: ['$standardQty', '$premiumQty'] } }
              }
            }
          ]);

          if (salesData.length > 0) {
            const totalQty = salesData.reduce((sum, item) => sum + item.monthlyQty, 0);
            // Average per month over the months they actually ordered (or 3, whichever is desired)
            // Let's divide by 3 (for 3 months average)
            doc.avgMonthlySales = Math.round(totalQty / 3);
          } else {
            doc.avgMonthlySales = 0;
          }
        } else {
          doc.avgMonthlySales = 0;
        }

        return doc;
      }));

      res.json(freezersWithSales);
    } catch (error) {
      console.error('Error fetching freezers:', error);
      res.status(500).json({ error: 'Failed to fetch freezers' });
    }
  }

  // Create a new freezer
  static async createFreezer(req: Request, res: Response) {
    try {
      const data = req.body;

      // Auto-generate Freezer ID (e.g. FRZ-0101)
      const lastFreezer = await Freezer.findOne().sort({ createdAt: -1 });
      let nextIdNumber = 101;
      
      if (lastFreezer && lastFreezer.freezerId && lastFreezer.freezerId.startsWith('FRZ-')) {
        const parts = lastFreezer.freezerId.split('-');
        if (parts.length === 2 && !isNaN(Number(parts[1]))) {
          nextIdNumber = parseInt(parts[1], 10) + 1;
        }
      }
      
      const freezerId = `FRZ-${nextIdNumber.toString().padStart(4, '0')}`;
      
      const freezer = new Freezer({
        ...data,
        freezerId
      });

      await freezer.save();
      res.status(201).json(freezer);
    } catch (error: any) {
      console.error('Error creating freezer:', error);
      res.status(400).json({ error: error.message || 'Failed to create freezer' });
    }
  }

  // Update a freezer
  static async updateFreezer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      // If status changed to 'Installed' and no installedDate is provided, set it to now
      if (data.status === 'Installed' && !data.installedDate) {
        // We need to check previous status
        const existing = await Freezer.findById(id);
        if (existing && existing.status !== 'Installed') {
          data.installedDate = new Date();
        }
      }

      const freezer = await Freezer.findByIdAndUpdate(id, data, { new: true });
      
      if (!freezer) {
        return res.status(404).json({ error: 'Freezer not found' });
      }
      
      res.json(freezer);
    } catch (error: any) {
      console.error('Error updating freezer:', error);
      res.status(400).json({ error: error.message || 'Failed to update freezer' });
    }
  }

  // Delete a freezer
  static async deleteFreezer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const freezer = await Freezer.findByIdAndDelete(id);
      
      if (!freezer) {
        return res.status(404).json({ error: 'Freezer not found' });
      }
      
      res.json({ message: 'Freezer deleted successfully' });
    } catch (error) {
      console.error('Error deleting freezer:', error);
      res.status(500).json({ error: 'Failed to delete freezer' });
    }
  }
}
