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
          const custId = (freezer.customerId as any)?._id || doc.customerId?._id || doc.customerId;
          // Aggregate orders for this customer in the last 3 months
          const salesData = await Order.aggregate([
            { 
              $match: { 
<<<<<<< HEAD
                customerId: (freezer.customerId as any)._id,
=======
                customerId: custId,
>>>>>>> feature_freezer
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

  // Get next available Freezer ID (e.g. PK-FR-0101, PK-FR-0102...)
  static async getNextFreezerId(req: Request, res: Response) {
    try {
      const freezers = await Freezer.find({}, 'freezerId');
      let maxNumber = 100; // So first ID starts at 101 -> PK-FR-0101

      for (const f of freezers) {
        if (f.freezerId) {
          const match = f.freezerId.match(/^PK-FR-(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      }

      const nextIdNumber = maxNumber + 1;
      const nextFreezerId = `PK-FR-${nextIdNumber.toString().padStart(4, '0')}`;
      res.json({ nextFreezerId });
    } catch (error) {
      console.error('Error generating next freezer ID:', error);
      res.status(500).json({ error: 'Failed to generate next freezer ID' });
    }
  }

  // Create a new freezer
  static async createFreezer(req: Request, res: Response) {
    try {
      const data = req.body;

<<<<<<< HEAD
      // Auto-generate Freezer ID (e.g. FRZ-0101)
      const lastFreezer = await Freezer.findOne().sort({ createdAt: -1 });
      let nextIdNumber = 101;
      
      if (lastFreezer && lastFreezer.freezerId && lastFreezer.freezerId.startsWith('FRZ-')) {
        const parts = lastFreezer.freezerId.split('-');
        if (parts.length === 2 && !isNaN(Number(parts[1]))) {
          nextIdNumber = parseInt(parts[1], 10) + 1;
=======
      let freezerId = typeof data.freezerId === 'string' ? data.freezerId.trim().toUpperCase() : '';

      // If freezerId is not provided, auto-generate sequential PK-FR-0101, PK-FR-0102...
      if (!freezerId) {
        const freezers = await Freezer.find({}, 'freezerId');
        let maxNumber = 100; // Starting from 101 -> PK-FR-0101

        for (const f of freezers) {
          if (f.freezerId) {
            const match = f.freezerId.match(/^PK-FR-(\d+)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
              }
            }
          }
        }

        const nextIdNumber = maxNumber + 1;
        freezerId = `PK-FR-${nextIdNumber.toString().padStart(4, '0')}`;
      } else {
        // Check uniqueness if custom/manual freezerId was provided
        const existing = await Freezer.findOne({ freezerId });
        if (existing) {
          return res.status(400).json({ error: `Freezer ID "${freezerId}" already exists.` });
>>>>>>> feature_freezer
        }
      }

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

      if (data.freezerId) {
        data.freezerId = data.freezerId.trim().toUpperCase();
        const existing = await Freezer.findOne({ freezerId: data.freezerId, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({ error: `Freezer ID "${data.freezerId}" already exists on another freezer.` });
        }
      }

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
