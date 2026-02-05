import { Response } from 'express';
import { stringify } from 'csv-stringify/sync';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Customer from '../models/Customer';
import Route from '../models/Route';
import { AuthRequest } from '../middleware/auth';
import { ROLES } from '../config/constants';

// Helper to convert route name to ID
async function getRouteIdByName(routeName: string): Promise<mongoose.Types.ObjectId | null> {
  const route = await Route.findOne({ name: routeName.toUpperCase() });
  return route?._id || null;
}

export class OrdersController {
  // Get orders (all for admin, own for users)
  static async getAllOrders(req: AuthRequest, res: Response) {
    try {
      const { date, route, vehicle, search, salesExecutive, page = '1', limit = '50' } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      
      const matchStage: any = {};

      // Apply direct filters
      if (date) {
        const startDate = new Date(date as string);
        const endDate = new Date(date as string);
        endDate.setHours(23, 59, 59, 999);
        matchStage.date = { $gte: startDate, $lte: endDate };
      }

      // Route filter - use ID directly
      if (route && route !== 'all') {
        try {
          matchStage.route = new mongoose.Types.ObjectId(route as string);
        } catch (error) {
          console.error('Invalid route ID:', route, error);
        }
      }

      if (vehicle) matchStage.vehicle = vehicle;

      // Users can only see orders for their customers (filter by salesExecutive at DB level)
      if (req.user?.role !== ROLES.ADMIN) {
        matchStage.salesExecutive = req.user?.username;
      } else if (salesExecutive) {
        // Admin can filter by specific salesExecutive
        matchStage.salesExecutive = salesExecutive;
      }

      // Build aggregation pipeline for optimal performance
      const pipeline: any[] = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'routes',
            localField: 'customer.route',
            foreignField: '_id',
            as: 'routeDoc'
          }
        },
        { $unwind: { path: '$routeDoc', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            customerName: { $ifNull: ['$customer.name', 'Customer Deleted'] },
            customerPhone: { $ifNull: ['$customer.phone', ''] },
            greenPrice: { $ifNull: ['$customer.greenPrice', 0] },
            orangePrice: { $ifNull: ['$customer.orangePrice', 0] },
            route: { $ifNull: ['$routeDoc.name', 'Unknown'] },
            standardTotal: {
              $multiply: ['$standardQty', { $ifNull: ['$customer.greenPrice', 0] }]
            },
            premiumTotal: {
              $multiply: ['$premiumQty', { $ifNull: ['$customer.orangePrice', 0] }]
            }
          }
        },
        {
          $addFields: {
            total: { $add: ['$standardTotal', '$premiumTotal'] }
          }
        }
      ];

      // Apply search filter at DB level if possible
      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { customerName: { $regex: search, $options: 'i' } },
              { customerPhone: { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      // Use $facet to get both paginated results and summary totals in one query
      pipeline.push({
        $facet: {
          // Paginated orders
          paginatedOrders: [
            { $sort: { date: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                customer: 0,
                routeDoc: 0
              }
            }
          ],
          // Summary totals (all filtered orders, not paginated)
          summary: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalStandardQty: { $sum: '$standardQty' },
                totalPremiumQty: { $sum: '$premiumQty' },
                totalRevenue: { $sum: '$total' }
              }
            }
          ]
        }
      });

      const result = await Order.aggregate(pipeline);
      const orders = result[0]?.paginatedOrders || [];
      const summaryData = result[0]?.summary[0] || {
        totalOrders: 0,
        totalStandardQty: 0,
        totalPremiumQty: 0,
        totalRevenue: 0
      };

      res.json({
        orders,
        pagination: {
          total: summaryData.totalOrders,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(summaryData.totalOrders / limitNum)
        },
        summary: {
          totalOrders: summaryData.totalOrders,
          totalStandardQty: summaryData.totalStandardQty,
          totalPremiumQty: summaryData.totalPremiumQty,
          totalRevenue: summaryData.totalRevenue
        }
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  // Create order
  static async createOrder(req: AuthRequest, res: Response) {
    try {
      const { date, customerId, vehicle, standardQty, premiumQty } = req.body;

      // Validate required fields
      if (!date || !customerId || !vehicle) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get customer to get route and snapshot prices
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
        salesExecutive: customer.salesExecutive,
        route: customer.route, // Use route ID from customer
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
  }

  // Update order
  static async updateOrder(req: AuthRequest, res: Response) {
    try {
      const { date, customerId, vehicle, standardQty, premiumQty } = req.body;

      const updateData: any = {};

      if (date) updateData.date = new Date(date);
      if (vehicle) updateData.vehicle = vehicle;

      // If customer changed, validate and update route too
      if (customerId) {
        const customer = await Customer.findById(customerId);
        if (!customer) {
          return res.status(404).json({ error: 'Customer not found' });
        }
        updateData.customerId = customer._id;
        updateData.salesExecutive = customer.salesExecutive;
        updateData.route = customer.route; // Update route from customer
      }

      // Check for duplicate order (same customer and same day) - exclude current order
      if (customerId || date) {
        const currentOrder = await Order.findById(req.params.id);
        if (!currentOrder) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const targetCustomerId = customerId || currentOrder.customerId;
        const orderDate = date ? new Date(date) : currentOrder.date;
        
        const startOfDay = new Date(orderDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(orderDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingOrder = await Order.findOne({
          _id: { $ne: req.params.id }, // Exclude current order being edited
          customerId: targetCustomerId,
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
      }

      // Update quantities
      if (standardQty !== undefined) updateData.standardQty = standardQty;
      if (premiumQty !== undefined) updateData.premiumQty = premiumQty;

      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('customerId').populate('route', 'name');

      if (!updatedOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Calculate prices dynamically and add customer data
      const orderObj: any = updatedOrder.toObject();
      const customer = orderObj.customerId as any;
      const route = orderObj.route as any;
      
      if (customer && customer.greenPrice !== undefined && customer.orangePrice !== undefined) {
        orderObj.customerName = customer.name;
        orderObj.customerPhone = customer.phone || '';
        orderObj.salesExecutive = customer.salesExecutive;
        orderObj.route = route?.name || 'Unknown';
        orderObj.greenPrice = customer.greenPrice;
        orderObj.orangePrice = customer.orangePrice;
        orderObj.standardTotal = orderObj.standardQty * customer.greenPrice;
        orderObj.premiumTotal = orderObj.premiumQty * customer.orangePrice;
        orderObj.total = orderObj.standardTotal + orderObj.premiumTotal;
      } else {
        orderObj.customerName = 'Customer Deleted';
        orderObj.customerPhone = '';
        orderObj.salesExecutive = '';
        orderObj.route = 'Unknown';
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
  }

  // Delete order
  static async deleteOrder(req: AuthRequest, res: Response) {
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
  }

  // Delete orders older than 7 days
  static async deleteOldOrders(req: AuthRequest, res: Response) {
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
  }

  // Delete last 30 days orders
  static async deleteLast30DaysOrders(req: AuthRequest, res: Response) {
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
  }

  // Export orders to CSV
  static async exportToCSV(req: AuthRequest, res: Response) {
    try {
      const { date, route, vehicle, search, salesExecutive } = req.query;
      
      const matchStage: any = {};

      // Apply direct filters
      if (date) {
        const startDate = new Date(date as string);
        const endDate = new Date(date as string);
        endDate.setHours(23, 59, 59, 999);
        matchStage.date = { $gte: startDate, $lte: endDate };
      }

      // Route filter - use ID directly
      if (route && route !== 'all') {
        try {
          matchStage.route = new mongoose.Types.ObjectId(route as string);
          console.log('Filtering by route ID:', matchStage.route);
        } catch (error) {
          console.error('Invalid route ID:', route, error);
        }
      }

      if (vehicle) matchStage.vehicle = vehicle;

      // Users can only export orders for their customers
      if (req.user?.role !== ROLES.ADMIN) {
        matchStage.salesExecutive = req.user?.username;
      } else if (salesExecutive) {
        matchStage.salesExecutive = salesExecutive;
      }

      // Build aggregation pipeline
      const pipeline: any[] = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'routes',
            localField: 'customer.route',
            foreignField: '_id',
            as: 'routeDoc'
          }
        },
        { $unwind: { path: '$routeDoc', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            customerName: { $ifNull: ['$customer.name', 'Customer Deleted'] },
            customerPhone: { $ifNull: ['$customer.phone', ''] },
            greenPrice: { $ifNull: ['$customer.greenPrice', 0] },
            orangePrice: { $ifNull: ['$customer.orangePrice', 0] },
            route: { $ifNull: ['$routeDoc.name', 'Unknown'] }
          }
        },
        {
          $addFields: {
            total: {
              $add: [
                { $multiply: ['$standardQty', '$greenPrice'] },
                { $multiply: ['$premiumQty', '$orangePrice'] }
              ]
            }
          }
        },
        { $sort: { date: -1, createdAt: -1 } }
      ];

      // Apply search filter
      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { customerName: { $regex: search, $options: 'i' } },
              { customerPhone: { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      const orders = await Order.aggregate(pipeline);

      // Prepare CSV data with dynamic price calculation
      const csvData = orders.map((order: any) => {
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
  }

  // Create message for order (authenticated users)
  static async createMessage(req: AuthRequest, res: Response) {
    try {
      const { text } = req.body;

      if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Message text is required' });
      }

      if (text.length > 1000) {
        return res.status(400).json({ error: 'Message text must not exceed 1000 characters' });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!order.orderMessages) {
        order.orderMessages = [];
      }

      order.orderMessages.push({
        text: text.trim(),
        role: req.user!.role as 'admin' | 'user',
        status: 'pending',
        createdAt: new Date(),
        createdBy: new mongoose.Types.ObjectId(req.user!.id),
        createdByUsername: req.user!.username
      });

      await order.save();
      res.status(201).json(order);
    } catch (error) {
      console.error('Create message error:', error);
      res.status(500).json({ error: 'Failed to create message' });
    }
  }

  // Update message status (admin only)
  static async updateMessageStatus(req: AuthRequest, res: Response) {
    try {
      const { status } = req.body;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!order.orderMessages || order.orderMessages.length === 0) {
        return res.status(404).json({ error: 'No messages found for this order' });
      }

      // Use Mongoose's native .id() method for better performance
      const message = (order.orderMessages as any).id(req.params.messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Only allow status updates for pending messages
      if (message.status !== 'pending') {
        return res.status(400).json({ error: 'Can only update status of pending messages' });
      }

      message.status = status;
      await order.save();
      res.json(order);
    } catch (error) {
      console.error('Update message status error:', error);
      res.status(500).json({ error: 'Failed to update message status' });
    }
  }

  // Edit message (creator only, pending only)
  static async editMessage(req: AuthRequest, res: Response) {
    try {
      const { text } = req.body;

      if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Message text is required' });
      }

      if (text.length > 1000) {
        return res.status(400).json({ error: 'Message text must not exceed 1000 characters' });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!order.orderMessages || order.orderMessages.length === 0) {
        return res.status(404).json({ error: 'No messages found for this order' });
      }

      const message = (order.orderMessages as any).id(req.params.messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Only allow editing pending messages
      if (message.status !== 'pending') {
        return res.status(400).json({ error: 'Can only edit pending messages' });
      }

      // Only creator can edit
      if (message.createdBy.toString() !== req.user!.id) {
        return res.status(403).json({ error: 'You can only edit your own messages' });
      }

      message.text = text.trim();
      await order.save();
      res.json(order);
    } catch (error) {
      console.error('Edit message error:', error);
      res.status(500).json({ error: 'Failed to edit message' });
    }
  }

  // Delete message (creator or admin, pending only)
  static async deleteMessage(req: AuthRequest, res: Response) {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!order.orderMessages || order.orderMessages.length === 0) {
        return res.status(404).json({ error: 'No messages found for this order' });
      }

      const message = (order.orderMessages as any).id(req.params.messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Only allow deleting pending messages
      if (message.status !== 'pending') {
        return res.status(400).json({ error: 'Can only delete pending messages' });
      }

      // Only creator or admin can delete
      const isCreator = message.createdBy.toString() === req.user!.id;
      const isAdmin = req.user!.role === ROLES.ADMIN;

      if (!isCreator && !isAdmin) {
        return res.status(403).json({ error: 'You can only delete your own messages' });
      }

      message.deleteOne();
      await order.save();
      res.json(order);
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }
}
