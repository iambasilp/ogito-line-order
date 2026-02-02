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

    const orders = await Order.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(orders);
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

    // Calculate totals
    const stdQty = standardQty || 0;
    const premQty = premiumQty || 0;
    const standardTotal = stdQty * customer.greenPrice;
    const premiumTotal = premQty * customer.orangePrice;
    const total = standardTotal + premiumTotal;

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
      greenPrice: customer.greenPrice,
      orangePrice: customer.orangePrice,
      standardTotal,
      premiumTotal,
      total,
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

// Update order (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date, customerId, route, vehicle, standardQty, premiumQty, greenPrice, orangePrice } = req.body;

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

    // Update quantities and prices
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const stdQty = standardQty !== undefined ? standardQty : order.standardQty;
    const premQty = premiumQty !== undefined ? premiumQty : order.premiumQty;
    const gPrice = greenPrice !== undefined ? greenPrice : order.greenPrice;
    const oPrice = orangePrice !== undefined ? orangePrice : order.orangePrice;

    updateData.standardQty = stdQty;
    updateData.premiumQty = premQty;
    updateData.greenPrice = gPrice;
    updateData.orangePrice = oPrice;
    updateData.standardTotal = stdQty * gPrice;
    updateData.premiumTotal = premQty * oPrice;
    updateData.total = updateData.standardTotal + updateData.premiumTotal;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
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

    const orders = await Order.find(filter).sort({ date: -1, createdAt: -1 });

    // Prepare CSV data
    const csvData = orders.map(order => {
      const row: any = {
        Date: new Date(order.date).toLocaleDateString(),
        Customer: order.customerName,
        Route: order.route,
        'Sales Executive': order.salesExecutive,
        Vehicle: order.vehicle,
        Phone: order.customerPhone,
        'Standard Qty': order.standardQty,
        'Premium Qty': order.premiumQty,
        Total: order.total.toFixed(2)
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
