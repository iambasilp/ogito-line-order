import { Response } from 'express';
import Receipt from '../models/Receipt';
import Order from '../models/Order';
import Customer from '../models/Customer';
import { AuthRequest, isGlobalViewer } from '../middleware/auth';
import { ROLES } from '../config/constants';

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

    // Role-based filtering: Sales Executives only see receipts for their orders/customers
    if (!isGlobalViewer(req.user)) {
      // Find orders for this executive
      const executiveOrders = await Order.find({ salesExecutive: req.user?.username }).select('_id');
      const orderIds = executiveOrders.map(o => o._id);
      
      // Find customers for this executive (for custom receipts)
      const executiveCustomers = await Customer.find({ salesExecutive: req.user?.username }).select('_id');
      const customerIds = executiveCustomers.map(c => c._id);

      query.$or = [
        { collectedBy: req.user?.username },
        { orderExecutive: req.user?.username },
        { orderId: { $in: orderIds } },
        { customerId: { $in: customerIds } }
      ];
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
      isCustom,
      customerId,
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

    let finalOrderCustomer = orderCustomer;
    let finalOrderRoute = orderRoute;

    if (isCustom && customerId) {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      finalOrderCustomer = customer.name;
      // Get route name
      // customer.route might be an ObjectId, so we need to either populate or assume it's stored as name in some places
      // We will rely on frontend sending the route name in orderRoute or fetch it here if needed.
      // But typically, customer.route is a reference to a Route document.
      // Since orderRoute is required in the schema, we'll use what's passed from frontend or fallback to "Custom".
      finalOrderRoute = orderRoute || "Custom";
    }

    const newReceipt = new Receipt({
      isCustom: isCustom || false,
      customerId: isCustom ? customerId : undefined,
      orderId: !isCustom ? orderId : undefined,
      orderCustomer: finalOrderCustomer,
      orderRoute: finalOrderRoute,
      orderTotal: isCustom ? 0 : orderTotal,
      amount,
      paymentType,
      transactionRef,
      collectedBy,
      collectedAt: collectedAt || new Date()
    });

    const savedReceipt = await newReceipt.save();

    // Automated Order Sync: Update billed status if fully paid (only for non-custom receipts)
    if (!isCustom && orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        const allReceipts = await Receipt.find({ orderId });
        const totalCollected = allReceipts.reduce((sum, r) => sum + r.amount, 0);

        if (totalCollected >= orderTotal && !order.billed) {
          await Order.findByIdAndUpdate(orderId, {
            billed: true,
            isUpdated: false
          });
        }
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

    // Security check: Only Admin or the person who collected it can delete
    if (req.user?.role !== ROLES.ADMIN && deletedReceipt.collectedBy !== req.user?.username) {
      return res.status(403).json({ message: 'You can only delete your own receipts' });
    }

    // Automated Order Sync: Re-evaluate billed status
    const order = await Order.findById(deletedReceipt.orderId);
    if (order) {
      const remainingReceipts = await Receipt.find({ orderId: order._id });
      const totalCollected = remainingReceipts.reduce((sum, r) => sum + r.amount, 0);

      // Fetch the real customer to recalculate total correctly
      const customer = await Customer.findById(order.customerId);
      const realOrderTotal = customer
        ? (order.standardQty * customer.greenPrice) + (order.premiumQty * customer.orangePrice)
        : (deletedReceipt.orderTotal || 0);

      // If no longer fully paid, unmark as billed
      if (totalCollected < realOrderTotal && order.billed) {
        await Order.findByIdAndUpdate(order._id, { billed: false });
      }
    }

    res.json({ message: 'Receipt deleted successfully', id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentType, transactionRef, collectedAt } = req.body;

    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // Security check: Only Admin or the person who collected it can edit
    if (req.user?.role !== ROLES.ADMIN && receipt.collectedBy !== req.user?.username) {
      return res.status(403).json({ message: 'You can only edit your own receipts' });
    }

    const oldAmount = receipt.amount;
    
    // Update fields
    if (amount !== undefined) receipt.amount = amount;
    if (paymentType !== undefined) receipt.paymentType = paymentType;
    if (transactionRef !== undefined) receipt.transactionRef = transactionRef;
    if (collectedAt !== undefined) receipt.collectedAt = new Date(collectedAt);

    const updatedReceipt = await receipt.save();

    // Re-evaluate billed status for non-custom receipts
    if (!receipt.isCustom && receipt.orderId) {
      const order = await Order.findById(receipt.orderId);
      if (order) {
        const allReceipts = await Receipt.find({ orderId: receipt.orderId });
        const totalCollected = allReceipts.reduce((sum, r) => sum + r.amount, 0);

        if (totalCollected >= (receipt.orderTotal || 0) && !order.billed) {
          await Order.findByIdAndUpdate(order._id, { billed: true, isUpdated: false });
        } else if (totalCollected < (receipt.orderTotal || 0) && order.billed) {
          await Order.findByIdAndUpdate(order._id, { billed: false });
        }
      }
    }

    res.json(updatedReceipt);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
