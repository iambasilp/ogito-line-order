import express from 'express';
import { stringify } from 'csv-stringify/sync';
import Order from '../models/Order';
import Customer from '../models/Customer';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { ROLES } from '../config/constants';

const router = express.Router();

// Get orders (all for admin, own for users)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { date, route, salesExecutive, vehicle, search } = req.query;
    
    const filter: any = {};

    // Users can only see their own orders
    if (req.user?.role !== ROLES.ADMIN) {
      filter.createdBy = req.user?.id;
    }

    // Apply filters
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(date as string);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (route) filter.route = route;
    if (salesExecutive) filter.salesExecutive = salesExecutive;
    if (vehicle) filter.vehicle = vehicle;
    
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(filter)
      .populate('customerId')
      .sort({ date: -1, createdAt: -1 });

    // Calculate prices dynamically from customer data
    const ordersWithPrices = orders.map(order => {
      const orderObj: any = order.toObject();
      const customer = orderObj.customerId as any;
      
      if (customer && customer.greenPrice !== undefined && customer.orangePrice !== undefined) {
        orderObj.greenPrice = customer.greenPrice;
        orderObj.orangePrice = customer.orangePrice;
        orderObj.standardTotal = orderObj.standardQty * customer.greenPrice;
        orderObj.premiumTotal = orderObj.premiumQty * customer.orangePrice;
        orderObj.total = orderObj.standardTotal + orderObj.premiumTotal;
      } else {
        // Fallback if customer not found or deleted
        orderObj.greenPrice = 0;
        orderObj.orangePrice = 0;
        orderObj.standardTotal = 0;
        orderObj.premiumTotal = 0;
        orderObj.total = 0;
      }
      
      return orderObj;
    });

    res.json(ordersWithPrices);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { date, customerId, route, vehicle, standardQty, premiumQty } = req.body;

    // Validate required fields
    if (!date || !customerId || !route || !vehicle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get customer to snapshot prices
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check for duplicate order (same customer and same day)
    const orderDate = new Date(date);
    const startOfDay = new Date(orderDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(orderDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingOrder = await Order.findOne({
      customerId: customer._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingOrder) {
      return res.status(400).json({ 
        error: 'An order for this customer has already been created for this date' 
      });
    }

    const stdQty = standardQty || 0;
    const premQty = premiumQty || 0;

    // Validate that at least one quantity is greater than 0
    if (stdQty === 0 && premQty === 0) {
      return res.status(400).json({ 
        error: 'At least one quantity (Standard or Premium) must be greater than 0' 
      });
    }

    const order = new Order({
      date: new Date(date),
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      route,
      salesExecutive: customer.salesExecutive,
      vehicle,
      standardQty: stdQty,
      premiumQty: premQty,
      createdBy: req.user?.id,
      createdByUsername: req.user?.username
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});
// Delete last 30 days orders (admin only)
router.delete('/bulk/last-30-days', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const result = await Order.deleteMany({
      date: { $gte: thirtyDaysAgo }
    });

    res.json({ 
      message: `Successfully deleted ${result.deletedCount} orders from the last 30 days`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Delete last 30 days orders error:', error);
    res.status(500).json({ error: 'Failed to delete orders' });
  }
});
// Update order (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date, customerId, route, vehicle, standardQty, premiumQty } = req.body;

    const updateData: any = {};

    if (date) updateData.date = new Date(date);
    if (route) updateData.route = route;
    if (vehicle) updateData.vehicle = vehicle;

    // If customer changed, get new customer data
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      updateData.customerId = customer._id;
      updateData.customerName = customer.name;
      updateData.customerPhone = customer.phone;
      updateData.salesExecutive = customer.salesExecutive;
    }

    // Update quantities
    if (standardQty !== undefined) updateData.standardQty = standardQty;
    if (premiumQty !== undefined) updateData.premiumQty = premiumQty;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customerId');

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Calculate prices dynamically
    const orderObj: any = updatedOrder.toObject();
    const customer = orderObj.customerId as any;
    
    if (customer && customer.greenPrice !== undefined && customer.orangePrice !== undefined) {
      orderObj.greenPrice = customer.greenPrice;
      orderObj.orangePrice = customer.orangePrice;
      orderObj.standardTotal = orderObj.standardQty * customer.greenPrice;
      orderObj.premiumTotal = orderObj.premiumQty * customer.orangePrice;
      orderObj.total = orderObj.standardTotal + orderObj.premiumTotal;
    } else {
      orderObj.greenPrice = 0;
      orderObj.orangePrice = 0;
      orderObj.standardTotal = 0;
      orderObj.premiumTotal = 0;
      orderObj.total = 0;
    }

    res.json(orderObj);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete orders older than 7 days (admin only)
router.delete('/bulk/old-data', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(23, 59, 59, 999);

    const result = await Order.deleteMany({
      date: { $lt: sevenDaysAgo }
    });

    res.json({ 
      message: `Successfully deleted ${result.deletedCount} orders older than 7 days`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Delete old orders error:', error);
    res.status(500).json({ error: 'Failed to delete orders' });
  }
});

// Delete order (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});
// Export orders to CSV
router.get('/export/csv', authenticate, async (req: AuthRequest, res) => {
  try {
    const { date, route, salesExecutive, vehicle, search } = req.query;
    
    const filter: any = {};

    // Users can only export their own orders
    if (req.user?.role !== ROLES.ADMIN) {
      filter.createdBy = req.user?.id;
    }

    // Apply same filters as list
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(date as string);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (route) filter.route = route;
    if (salesExecutive) filter.salesExecutive = salesExecutive;
    if (vehicle) filter.vehicle = vehicle;
    
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(filter)
      .populate('customerId')
      .sort({ date: -1, createdAt: -1 });

    // Prepare CSV data with dynamic price calculation
    const csvData = orders.map(order => {
      const customer = order.customerId as any;
      const total = customer && customer.greenPrice !== undefined && customer.orangePrice !== undefined
        ? (order.standardQty * customer.greenPrice) + (order.premiumQty * customer.orangePrice)
        : 0;

      const row: any = {
        Date: new Date(order.date).toLocaleDateString(),
        Customer: order.customerName,
        Route: order.route,
        'Sales Executive': order.salesExecutive,
        Vehicle: order.vehicle,
        Phone: order.customerPhone,
        'Standard Qty': order.standardQty,
        'Premium Qty': order.premiumQty,
        Total: total.toFixed(2)
      };

      // Only include creator for admin
      if (req.user?.role === ROLES.ADMIN) {
        row['Created By'] = order.createdByUsername;
      }

      return row;
    });

    const csv = stringify(csvData, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export orders' });
  }
});

export default router;
