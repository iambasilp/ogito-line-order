import { Response } from 'express';
import mongoose from 'mongoose';
import PaymentCollection from '../models/PaymentCollection';
import Customer from '../models/Customer';
import Order from '../models/Order';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { ROLES } from '../config/constants';

export class PaymentCollectionsController {
  // Create a new payment collection record
  static async createCollection(req: AuthRequest, res: Response) {
    try {
      // Role check: Only drivers (and admins) can record cash collections
      if (req.user?.role !== ROLES.DRIVER && req.user?.role !== ROLES.ADMIN) {
        return res.status(403).json({ error: 'Only drivers can record cash collections' });
      }

      const { customerId, orderId, amount, paymentMode, date, notes, vehicle } = req.body;

      if (!customerId) {
        return res.status(400).json({ error: 'Customer is required' });
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid payment amount greater than 0 is required' });
      }

      if (!['Cash', 'UPI'].includes(paymentMode)) {
        return res.status(400).json({ error: 'Payment mode must be either Cash or UPI' });
      }

      // Fetch customer details
      const customer = await Customer.findById(customerId).populate('route', 'name');
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Fetch user details for display name
      const user = await User.findById(req.user?.id);
      const collectorName = user?.name || req.user?.username || 'Unknown';

      // Optional Order details
      let routeId = customer.route?._id || customer.route;
      let routeName = (customer.route as any)?.name;
      let resolvedVehicle = vehicle;

      if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
        const order = await Order.findById(orderId).populate('route', 'name');
        if (order) {
          if (order.route) {
            routeId = order.route._id || order.route;
            routeName = (order.route as any)?.name || routeName;
          }
          if (order.vehicle && !resolvedVehicle) {
            resolvedVehicle = order.vehicle;
          }
        }
      }

      const collectionDate = date ? new Date(date) : new Date();

      const newCollection = new PaymentCollection({
        customerId: customer._id,
        customerName: customer.name,
        orderId: orderId && mongoose.Types.ObjectId.isValid(orderId) ? orderId : undefined,
        amount: numAmount,
        paymentMode,
        date: collectionDate,
        collectedBy: req.user?.id,
        collectedByUsername: req.user?.username,
        collectedByName: collectorName,
        route: routeId,
        routeName,
        vehicle: resolvedVehicle,
        notes: notes ? notes.trim() : undefined,
        status: 'Collected',
      });

      await newCollection.save();

      res.status(201).json(newCollection);
    } catch (error: any) {
      console.error('Error creating payment collection:', error);
      res.status(500).json({ error: error.message || 'Failed to record payment collection' });
    }
  }

  // Get collections with filtering & summaries
  static async getCollections(req: AuthRequest, res: Response) {
    try {
      // Role check: Only driver, admin, and ceo can access cash collections
      if (req.user?.role !== ROLES.DRIVER && req.user?.role !== ROLES.ADMIN && req.user?.role !== ROLES.CEO) {
        return res.status(403).json({ error: 'Access denied to cash collections' });
      }

      const {
        startDate,
        endDate,
        date,
        customerId,
        orderId,
        paymentMode,
        collectedBy,
        route,
        vehicle,
        search,
      } = req.query;

      const query: any = { status: { $ne: 'Cancelled' } };

      // Date range filter
      if (startDate || endDate) {
        query.date = {};
        if (startDate) {
          const s = new Date(startDate as string);
          s.setHours(0, 0, 0, 0);
          query.date.$gte = s;
        }
        if (endDate) {
          const e = new Date(endDate as string);
          e.setHours(23, 59, 59, 999);
          query.date.$lte = e;
        }
      } else if (date) {
        const d = new Date(date as string);
        const s = new Date(d);
        s.setHours(0, 0, 0, 0);
        const e = new Date(d);
        e.setHours(23, 59, 59, 999);
        query.date = { $gte: s, $lte: e };
      }

      // Customer filter
      if (customerId && customerId !== 'all') {
        query.customerId = customerId;
      }

      // Order filter
      if (orderId) {
        query.orderId = orderId;
      }

      // Payment Mode filter
      if (paymentMode && paymentMode !== 'all') {
        query.paymentMode = paymentMode;
      }

      // Collector filter: Drivers only see their own collections, Admin/CEO can see all or filter
      if (req.user?.role === ROLES.DRIVER) {
        query.collectedByUsername = req.user.username;
      } else if (collectedBy && collectedBy !== 'all') {
        query.collectedByUsername = collectedBy;
      }

      // Route filter
      if (route && route !== 'all') {
        query.route = route;
      }

      // Vehicle filter
      if (vehicle && vehicle !== 'all') {
        query.vehicle = vehicle;
      }

      // Search text (customer name or notes)
      if (search) {
        const searchRegex = new RegExp(String(search).trim(), 'i');
        query.$or = [
          { customerName: searchRegex },
          { notes: searchRegex },
          { collectedByName: searchRegex },
          { collectedByUsername: searchRegex },
        ];
      }

      const collections = await PaymentCollection.find(query)
        .populate('customerId', 'name phone route shopName')
        .populate('route', 'name')
        .sort({ date: -1, createdAt: -1 });

      // Calculate totals
      let totalAmount = 0;
      let totalCash = 0;
      let totalUPI = 0;

      collections.forEach((c) => {
        totalAmount += c.amount || 0;
        if (c.paymentMode === 'Cash') {
          totalCash += c.amount || 0;
        } else if (c.paymentMode === 'UPI') {
          totalUPI += c.amount || 0;
        }
      });

      res.json({
        collections,
        summary: {
          totalAmount,
          totalCash,
          totalUPI,
          totalCount: collections.length,
        },
      });
    } catch (error: any) {
      console.error('Error fetching payment collections:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch collections' });
    }
  }

  // Get collections for today (quick summary and mapping for daily orders)
  static async getTodayCollections(req: AuthRequest, res: Response) {
    try {
      // Role check: Only driver, admin, and ceo can access cash collections
      if (req.user?.role !== ROLES.DRIVER && req.user?.role !== ROLES.ADMIN && req.user?.role !== ROLES.CEO) {
        return res.status(403).json({ error: 'Access denied to cash collections' });
      }

      const { driver } = req.query;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const query: any = {
        date: { $gte: todayStart, $lte: todayEnd },
        status: { $ne: 'Cancelled' },
      };

      // If user is a driver, restrict to their collections
      if (req.user?.role === ROLES.DRIVER) {
        query.collectedByUsername = req.user.username;
      } else if (driver && driver !== 'all') {
        query.collectedByUsername = driver;
      }

      const collections = await PaymentCollection.find(query)
        .populate('customerId', 'name phone route')
        .sort({ createdAt: -1 });

      let totalAmount = 0;
      let totalCash = 0;
      let totalUPI = 0;

      // Group by customerId and orderId for fast lookups on frontend
      const byCustomerId: Record<string, any[]> = {};
      const byOrderId: Record<string, any[]> = {};

      collections.forEach((c) => {
        totalAmount += c.amount || 0;
        if (c.paymentMode === 'Cash') {
          totalCash += c.amount || 0;
        } else if (c.paymentMode === 'UPI') {
          totalUPI += c.amount || 0;
        }

        const cId = c.customerId?._id?.toString() || c.customerId?.toString();
        if (cId) {
          if (!byCustomerId[cId]) byCustomerId[cId] = [];
          byCustomerId[cId].push(c);
        }

        if (c.orderId) {
          const oId = c.orderId.toString();
          if (!byOrderId[oId]) byOrderId[oId] = [];
          byOrderId[oId].push(c);
        }
      });

      res.json({
        collections,
        byCustomerId,
        byOrderId,
        summary: {
          totalAmount,
          totalCash,
          totalUPI,
          totalCount: collections.length,
        },
      });
    } catch (error: any) {
      console.error('Error fetching today collections:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch today collections' });
    }
  }

  // Update a collection record (amount, paymentMode, notes)
  static async updateCollection(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { amount, paymentMode, notes, date } = req.body;

      const collection = await PaymentCollection.findById(id);
      if (!collection) {
        return res.status(404).json({ error: 'Collection record not found' });
      }

      // Check permission: Admin, CEO, or user who created it
      const isAdminOrCeo = req.user?.role === ROLES.ADMIN || req.user?.role === ROLES.CEO;
      const isCreator = req.user?.id === collection.collectedBy.toString();

      if (!isAdminOrCeo && !isCreator) {
        return res.status(403).json({ error: 'Permission denied to edit this collection record' });
      }

      if (amount !== undefined) {
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return res.status(400).json({ error: 'Valid amount greater than 0 is required' });
        }
        collection.amount = numAmount;
      }

      if (paymentMode !== undefined) {
        if (!['Cash', 'UPI'].includes(paymentMode)) {
          return res.status(400).json({ error: 'Payment mode must be either Cash or UPI' });
        }
        collection.paymentMode = paymentMode;
      }

      if (notes !== undefined) {
        collection.notes = notes ? notes.trim() : '';
      }

      if (date) {
        collection.date = new Date(date);
      }

      await collection.save();
      res.json(collection);
    } catch (error: any) {
      console.error('Error updating collection:', error);
      res.status(500).json({ error: error.message || 'Failed to update collection' });
    }
  }

  // Delete / Cancel a collection record
  static async deleteCollection(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const collection = await PaymentCollection.findById(id);
      if (!collection) {
        return res.status(404).json({ error: 'Collection record not found' });
      }

      const isAdminOrCeo = req.user?.role === ROLES.ADMIN || req.user?.role === ROLES.CEO;
      const isCreator = req.user?.id === collection.collectedBy.toString();

      if (!isAdminOrCeo && !isCreator) {
        return res.status(403).json({ error: 'Permission denied to delete this collection record' });
      }

      await PaymentCollection.findByIdAndDelete(id);
      res.json({ message: 'Collection record deleted successfully', id });
    } catch (error: any) {
      console.error('Error deleting collection:', error);
      res.status(500).json({ error: error.message || 'Failed to delete collection' });
    }
  }
}
