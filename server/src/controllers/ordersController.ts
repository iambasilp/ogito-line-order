import { Response } from 'express';
import { stringify } from 'csv-stringify/sync';
import Order from '../models/Order';
import Customer from '../models/Customer';
import { AuthRequest } from '../middleware/auth';
import { ROLES } from '../config/constants';

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

      if (route) matchStage.route = route;
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
          $addFields: {
            customerName: { $ifNull: ['$customer.name', 'Customer Deleted'] },
            customerPhone: { $ifNull: ['$customer.phone', ''] },
            greenPrice: { $ifNull: ['$customer.greenPrice', 0] },
            orangePrice: { $ifNull: ['$customer.orangePrice', 0] },
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

      // Get total count before pagination
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await Order.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Add sorting and pagination
      pipeline.push(
        { $sort: { date: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum }
      );

      // Project only needed fields to reduce data transfer
      pipeline.push({
        $project: {
          customer: 0,
          customerId: 0
        }
      });

      const orders = await Order.aggregate(pipeline);

      res.json({
        orders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
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
        salesExecutive: customer.salesExecutive,
        route,
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
      const { date, customerId, route, vehicle, standardQty, premiumQty } = req.body;

      const updateData: any = {};

      if (date) updateData.date = new Date(date);
      if (route) updateData.route = route;
      if (vehicle) updateData.vehicle = vehicle;

      // If customer changed, validate customer exists
      if (customerId) {
        const customer = await Customer.findById(customerId);
        if (!customer) {
          return res.status(404).json({ error: 'Customer not found' });
        }
        updateData.customerId = customer._id;
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

      // Calculate prices dynamically and add customer data
      const orderObj: any = updatedOrder.toObject();
      const customer = orderObj.customerId as any;
      
      if (customer && customer.greenPrice !== undefined && customer.orangePrice !== undefined) {
        orderObj.customerName = customer.name;
        orderObj.customerPhone = customer.phone || '';
        orderObj.salesExecutive = customer.salesExecutive;
        orderObj.greenPrice = customer.greenPrice;
        orderObj.orangePrice = customer.orangePrice;
        orderObj.standardTotal = orderObj.standardQty * customer.greenPrice;
        orderObj.premiumTotal = orderObj.premiumQty * customer.orangePrice;
        orderObj.total = orderObj.standardTotal + orderObj.premiumTotal;
      } else {
        orderObj.customerName = 'Customer Deleted';
        orderObj.customerPhone = '';
        orderObj.salesExecutive = '';
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

      if (route) matchStage.route = route;
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
          $addFields: {
            customerName: { $ifNull: ['$customer.name', 'Customer Deleted'] },
            customerPhone: { $ifNull: ['$customer.phone', ''] },
            greenPrice: { $ifNull: ['$customer.greenPrice', 0] },
            orangePrice: { $ifNull: ['$customer.orangePrice', 0] }
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
}
