import { Response } from 'express';
import Receipt from '../models/Receipt';
import Order from '../models/Order';
import { AuthRequest, isGlobalViewer } from '../middleware/auth';

export const getReceipts = async (req: AuthRequest, res: Response) => {
  try {
    const { date, orderId } = req.query;
    const query: any = {};

    if (orderId) query.orderId = orderId;
    if (date) {
      const start = new Date(date as string);
      const end = new Date(date as string);
      end.setHours(23, 59, 59, 999);
      query.collectedAt = { $gte: start, $lte: end };
    }

    // Role-based filtering: Sales Executives only see receipts for their orders
    if (!isGlobalViewer(req.user)) {
      // Find orders for this executive first
      const executiveOrders = await Order.find({ salesExecutive: req.user?.username }).select('_id');
      const orderIds = executiveOrders.map(o => o._id);
      query.orderId = { $in: orderIds };
    }

    const receipts = await Receipt.find(query).sort({ collectedAt: -1 });
    res.json(receipts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const {
      orderId,
      orderCustomer,
      orderRoute,
      orderTotal,
      amount,
      paymentType,
      transactionRef,
      collectedBy,
      collectedAt
    } = req.body;

    const newReceipt = new Receipt({
      orderId,
      orderCustomer,
      orderRoute,
      orderTotal,
      amount,
      paymentType,
      transactionRef,
      collectedBy,
      collectedAt: collectedAt || new Date()
    });

    const savedReceipt = await newReceipt.save();

    // Automated Order Sync: Update billed status if fully paid
    const order = await Order.findById(orderId);
    if (order) {
      const allReceipts = await Receipt.find({ orderId });
      const totalCollected = allReceipts.reduce((sum, r) => sum + r.amount, 0);

      if (totalCollected >= orderTotal && !order.billed) {
        order.billed = true;
        order.isUpdated = false; // Reset updated flag when billed
        await order.save();
      }
    }

    res.status(201).json(savedReceipt);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deletedReceipt = await Receipt.findByIdAndDelete(id);

    if (!deletedReceipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // Automated Order Sync: Re-evaluate billed status
    const order = await Order.findById(deletedReceipt.orderId);
    if (order) {
      const remainingReceipts = await Receipt.find({ orderId: order._id });
      const totalCollected = remainingReceipts.reduce((sum, r) => sum + r.amount, 0);

      // If no longer fully paid, unmark as billed
      if (totalCollected < (deletedReceipt.orderTotal || 0) && order.billed) {
        order.billed = false;
        await order.save();
      }
    }

    res.json({ message: 'Receipt deleted successfully', id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
