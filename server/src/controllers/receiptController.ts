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

// Helper to recalculate and update order billing status based on all receipts
const syncOrderBillingStatus = async (orderId: string) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return;

    const receipts = await Receipt.find({ orderId });
    const totalCollected = receipts.reduce((sum, r) => sum + r.amount, 0);

    // Fetch the actual current total of the order from the DB (calculated in aggregate)
    // For now, we use the sum of greenPrice * greenQty + orangePrice * orangeQty
    // But since the Order model doesn't store 'total' as a field, we compare with the orderTotal provided in receipts
    // or we can calculate it if we lookup the customer.
    // For simplicity and safety, if totalCollected >= (receipt.orderTotal), mark as billed.

    // Get the expected total from the latest receipt for this order
    const latestReceipt = await Receipt.findOne({ orderId }).sort({ collectedAt: -1 });
    const expectedTotal = latestReceipt ? latestReceipt.orderTotal : 0;

    const isFullyPaid = totalCollected >= (expectedTotal || 0);

    if (isFullyPaid !== order.billed) {
      await Order.findByIdAndUpdate(orderId, {
        billed: isFullyPaid,
        isUpdated: !isFullyPaid // Set isUpdated to true if we revert to unbilled
      });
    }
  } catch (error) {
    console.error('Failed to sync order billing status:', error);
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

    // Validation
    if (!orderCustomer || !orderRoute || !amount || !paymentType) {
      return res.status(400).json({ message: 'Missing required receipt fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    if (paymentType !== 'Cash' && !transactionRef) {
      return res.status(400).json({ message: 'Transaction reference is required for non-cash payments' });
    }

    const newReceipt = new Receipt({
      orderId,
      orderCustomer,
      orderRoute,
      orderTotal,
      amount,
      paymentType,
      transactionRef,
      collectedBy: collectedBy || req.user?.username || 'unknown',
      collectedAt: collectedAt || new Date()
    });

    const savedReceipt = await newReceipt.save();

    // Trigger sync if linked to an order
    if (orderId) {
      await syncOrderBillingStatus(orderId);
    }

    res.status(201).json(savedReceipt);
  } catch (error: any) {
    console.error('Create receipt error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deletedReceipt = await Receipt.findByIdAndDelete(id);

    if (!deletedReceipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // Trigger sync if linked to an order
    if (deletedReceipt.orderId) {
      await syncOrderBillingStatus(deletedReceipt.orderId.toString());
    }

    res.json({ message: 'Receipt deleted successfully', id });
  } catch (error: any) {
    console.error('Delete receipt error:', error);
    res.status(500).json({ message: error.message });
  }
};
