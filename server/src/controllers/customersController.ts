import { Response } from 'express';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import mongoose from 'mongoose';
import Customer from '../models/Customer';
import User from '../models/User';
import Route from '../models/Route';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { ROLES } from '../config/constants';

// Helper function to find route by name
async function getRouteIdByName(routeName: string): Promise<mongoose.Types.ObjectId | null> {
  const route = await Route.findOne({ name: routeName.toUpperCase(), isActive: true });
  return route?._id || null;
}

export class CustomersController {
  // Get all customers with pagination and filtering
  static async getAllCustomers(req: AuthRequest, res: Response) {
    try {
      const { route, search, page = '1', limit = '50' } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = {};
      
      // Route filter - convert name to ID if provided
      if (route && route !== 'all') {
        const routeId = await getRouteIdByName(route as string);
        if (routeId) {
          query.route = routeId;
        }
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination and populate route
      const [customers, total] = await Promise.all([
        Customer.find(query)
          .populate('route', 'name')
          .sort({ name: 1 })
          .skip(skip)
          .limit(limitNum),
        Customer.countDocuments(query)
      ]);

      res.json({
        customers,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  }

  // Get single customer
  static async getCustomerById(req: AuthRequest, res: Response) {
    try {
      const customer = await Customer.findById(req.params.id).populate('route', 'name');
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({ error: 'Failed to fetch customer' });
    }
  }

  // Create customer
  static async createCustomer(req: AuthRequest, res: Response) {
    try {
      const { name, route } = req.body;
      
      // Convert route name to route ID
      if (!route) {
        return res.status(400).json({ error: 'Route is required' });
      }

      const routeId = await getRouteIdByName(route);
      if (!routeId) {
        return res.status(400).json({ error: `Route '${route}' not found or inactive` });
      }

      // Check if customer name already exists (case-insensitive)
      const existingCustomer = await Customer.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
      });
      if (existingCustomer) {
        return res.status(400).json({ error: 'A customer with this name already exists' });
      }

      // Replace route name with ID
      const customerData = { ...req.body, route: routeId };
      const customer = new Customer(customerData);
      await customer.save();
      
      // Populate route for response
      await customer.populate('route', 'name');
      res.status(201).json(customer);
    } catch (error: any) {
      console.error('Create customer error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ error: 'A customer with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }

  // Update customer
  static async updateCustomer(req: AuthRequest, res: Response) {
    try {
      const { route, salesExecutive, name } = req.body;
      
      // Convert route name to route ID if provided
      if (route) {
        const routeId = await getRouteIdByName(route);
        if (!routeId) {
          return res.status(400).json({ error: `Route '${route}' not found or inactive` });
        }
        req.body.route = routeId;
      }

      // Get the old customer data to check if salesExecutive changed
      const oldCustomer = await Customer.findById(req.params.id);
      if (!oldCustomer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check if name is being changed and if it conflicts with another customer (case-insensitive)
      if (name && name.trim() !== oldCustomer.name) {
        const existingCustomer = await Customer.findOne({ 
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          _id: { $ne: req.params.id }
        });
        if (existingCustomer) {
          return res.status(400).json({ error: 'A customer with this name already exists' });
        }
      }

      const customer = await Customer.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('route', 'name');

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // If salesExecutive changed, update all related orders asynchronously
      if (salesExecutive && oldCustomer.salesExecutive !== salesExecutive) {
        Order.updateMany(
          { customerId: customer._id },
          { $set: { salesExecutive: salesExecutive } }
        ).exec().catch(err => {
          console.error('Failed to update orders salesExecutive:', err);
        });
      }

      // If route changed, update all related orders asynchronously
      if (route && !oldCustomer.route.equals(customer.route)) {
        Order.updateMany(
          { customerId: customer._id },
          { $set: { route: customer.route } }
        ).exec().catch(err => {
          console.error('Failed to update orders route:', err);
        });
      }

      res.json(customer);
    } catch (error: any) {
      console.error('Update customer error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ error: 'A customer with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  // Delete customer
  static async deleteCustomer(req: AuthRequest, res: Response) {
    try {
      // Check if customer has any orders
      const ordersCount = await Order.countDocuments({ customerId: req.params.id });
      
      if (ordersCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete customer. They have ${ordersCount} order(s). Please delete the orders first.` 
        });
      }

      const customer = await Customer.findByIdAndDelete(req.params.id);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  }

  // Import customers from CSV
  static async importCustomers(req: AuthRequest, res: Response) {
    try {
      const { csvData } = req.body;

      if (!csvData) {
        return res.status(400).json({ error: 'CSV data is required' });
      }

      // Parse CSV
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      if (records.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty' });
      }

      // Validate all routes first before processing any records
      const routeNames = new Set(records.map((r: any) => r.Route?.toUpperCase()).filter(Boolean));
      const routeMap = new Map();
      
      for (const routeName of routeNames) {
        const route = await Route.findOne({ name: routeName, isActive: true });
        if (!route) {
          return res.status(400).json({ 
            error: `Route '${routeName}' not found or inactive. Please create it first in the Routes page.` 
          });
        }
        routeMap.set(routeName, route._id);
      }

      let imported = 0;
      let updated = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const record of records) {
        try {
          const { Name: name, Route: route, SalesExecutive: salesExecutive, GreenPrice, OrangePrice, Phone: phone } = record;

          // Validate required fields
          if (!name || !route || !salesExecutive || GreenPrice === undefined || OrangePrice === undefined) {
            failed++;
            errors.push(`Row skipped - missing required fields: ${JSON.stringify(record)}`);
            continue;
          }

          // Convert route name to ID
          const routeId = routeMap.get(route.toUpperCase());

          // Find sales executive by name (case-insensitive match)
          const salesUser = await User.findOne({ 
            name: { $regex: new RegExp(`^${salesExecutive.trim()}$`, 'i') },
            role: ROLES.USER 
          });
          
          if (!salesUser) {
            failed++;
            errors.push(`Row skipped - sales executive '${salesExecutive}' not found: ${name}`);
            continue;
          }

          // Parse prices
          const greenPrice = parseFloat(GreenPrice?.toString().replace(/[₹,]/g, '') || '0');
          const orangePrice = parseFloat(OrangePrice?.toString().replace(/[₹,]/g, '') || '0');

          if (isNaN(greenPrice) || isNaN(orangePrice)) {
            failed++;
            errors.push(`Row skipped - invalid price format: ${name}`);
            continue;
          }

          // Check if customer already exists (case-insensitive, globally unique)
          const existing = await Customer.findOne({ 
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
          });
          if (existing) {
            // Update existing customer
            existing.salesExecutive = salesUser.username;
            existing.greenPrice = greenPrice;
            existing.orangePrice = orangePrice;
            existing.phone = phone || '';
            await existing.save();
            updated++;
          } else {
            // Create new customer
            const customer = new Customer({
              name: name.trim(),
              route: routeId,
              salesExecutive: salesUser.username,
              greenPrice,
              orangePrice,
              phone: phone || ''
            });
            await customer.save();
            imported++;
          }
        } catch (error: any) {
          failed++;
          errors.push(`Failed to import ${record.Name}: ${error.message}`);
        }
      }

      res.json({
        message: `Import completed. ${imported} new customers created, ${updated} customers updated, ${failed} failed.`,
        imported,
        updated,
        failed,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error messages
      });
    } catch (error) {
      console.error('Import customers error:', error);
      res.status(500).json({ error: 'Failed to import customers' });
    }
  }

  // Export customers to CSV
  static async exportToCSV(req: AuthRequest, res: Response) {
    try {
      const { route, search } = req.query;

      // Build query (same as getAllCustomers but without pagination)
      const query: any = {};
      
      // Route filter - convert name to ID if provided
      if (route && route !== 'all') {
        const routeId = await getRouteIdByName(route as string);
        if (routeId) {
          query.route = routeId;
        }
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      // Get all customers (no pagination for export)
      const customers = await Customer.find(query)
        .populate('route', 'name')
        .sort({ name: 1 });

      // Prepare CSV data
      const csvData = customers.map((customer: any) => ({
        Name: customer.name,
        Route: typeof customer.route === 'object' ? customer.route.name : customer.route,
        'Sales Executive': customer.salesExecutive,
        'Green Price': customer.greenPrice,
        'Orange Price': customer.orangePrice,
        Phone: customer.phone || ''
      }));

      const csv = stringify(csvData, { header: true });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=customers-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('Export customers CSV error:', error);
      res.status(500).json({ error: 'Failed to export customers' });
    }
  }
}
