import { Response } from 'express';
import { parse } from 'csv-parse/sync';
import Customer from '../models/Customer';
import User from '../models/User';
import Route from '../models/Route';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { ROLES } from '../config/constants';

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

      if (route && route !== 'all') {
        query.route = route;
      }



      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination
      const [customers, total] = await Promise.all([
        Customer.find(query)
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
      const customer = await Customer.findById(req.params.id);
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

      // Validate route exists in database
      if (route) {
        const routeExists = await Route.findOne({ name: route.toUpperCase(), isActive: true });
        if (!routeExists) {
          return res.status(400).json({ error: 'Invalid route. Route does not exist.' });
        }
      }

      // Check for duplicate customer (name + route combination)
      const routeUpper = route?.toUpperCase();
      const existingCustomer = await Customer.findOne({
        name: name.trim(),
        route: routeUpper
      });

      if (existingCustomer) {
        return res.status(400).json({
          error: `Customer "${name}" already exists on route "${routeUpper}"`
        });
      }

      // Ensure route is uppercase
      const customer = new Customer({
        ...req.body,
        name: name.trim(),
        route: routeUpper
      });
      await customer.save();
      res.status(201).json(customer);
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }

  // Update customer
  static async updateCustomer(req: AuthRequest, res: Response) {
    try {
      const { route, salesExecutive } = req.body;

      // Validate route exists in database
      if (route) {
        const routeExists = await Route.findOne({ name: route.toUpperCase(), isActive: true });
        if (!routeExists) {
          return res.status(400).json({ error: 'Invalid route. Route does not exist.' });
        }
      }

      // Get the old customer data to check if salesExecutive changed
      const oldCustomer = await Customer.findById(req.params.id);
      if (!oldCustomer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customer = await Customer.findByIdAndUpdate(
        req.params.id,
        { ...req.body, route: route?.toUpperCase() },
        { new: true, runValidators: true }
      );

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

      res.json(customer);
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  // Delete customer
  static async deleteCustomer(req: AuthRequest, res: Response) {
    try {
      const customer = await Customer.findByIdAndDelete(req.params.id);

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json({ message: 'Customer deleted successfully', customer });
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

      // Validate all rows first
      const validatedCustomers = [];
      const errors = [];
      const seenCustomers = new Map(); // Track duplicates within CSV

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2; // +2 because row 1 is header and arrays are 0-indexed
        const rowErrors = [];

        // Validate required fields
        if (!row.Name || !row.Name.trim()) {
          rowErrors.push('Missing customer name');
        }
        if (!row.Route || !row.Route.trim()) {
          rowErrors.push('Missing route');
        }
        if (!row.SalesExecutive || !row.SalesExecutive.trim()) {
          rowErrors.push('Missing sales executive');
        }

        // If missing required fields, add error and continue
        if (rowErrors.length > 0) {
          errors.push({
            row: rowNum,
            data: row.Name || '(empty)',
            issues: rowErrors
          });
          continue;
        }

        // Check for duplicate within CSV
        const customerKey = `${row.Name.trim().toLowerCase()}|${row.Route.trim().toUpperCase()}`;
        if (seenCustomers.has(customerKey)) {
          errors.push({
            row: rowNum,
            data: row.Name,
            issues: [`Duplicate entry - same customer already exists in row ${seenCustomers.get(customerKey)}`]
          });
          continue;
        }
        seenCustomers.set(customerKey, rowNum);

        // Validate route exists in database
        const routeUpper = row.Route.trim().toUpperCase();
        const routeExists = await Route.findOne({ name: routeUpper, isActive: true });
        if (!routeExists) {
          errors.push({
            row: rowNum,
            data: row.Name,
            issues: [`Invalid route '${row.Route}' - not found in system`]
          });
          continue;
        }

        // Check if customer already exists in database
        const existingCustomer = await Customer.findOne({
          name: row.Name.trim(),
          route: routeUpper
        });
        if (existingCustomer) {
          errors.push({
            row: rowNum,
            data: row.Name,
            issues: [`Customer already exists in database on route "${routeUpper}"`]
          });
          continue;
        }

        // Find sales executive by name (case-insensitive match)
        const salesUser = await User.findOne({
          name: { $regex: new RegExp(`^${row.SalesExecutive.trim()}$`, 'i') },
          role: ROLES.USER
        });

        if (!salesUser) {
          errors.push({
            row: rowNum,
            data: row.Name,
            issues: [`Sales Executive '${row.SalesExecutive}' not found in system`]
          });
          continue;
        }

        // Parse and validate prices
        const greenPrice = parseFloat(row.GreenPrice?.replace(/[₹,]/g, '') || '0');
        const orangePrice = parseFloat(row.OrangePrice?.replace(/[₹,]/g, '') || '0');

        if (isNaN(greenPrice) || isNaN(orangePrice)) {
          errors.push({
            row: rowNum,
            data: row.Name,
            issues: [`Invalid price format (Green: ${row.GreenPrice}, Orange: ${row.OrangePrice})`]
          });
          continue;
        }

        if (greenPrice < 0 || orangePrice < 0) {
          errors.push({
            row: rowNum,
            data: row.Name,
            issues: ['Prices cannot be negative']
          });
          continue;
        }

        validatedCustomers.push({
          name: row.Name.trim(),
          route: routeUpper,
          salesExecutive: salesUser.username, // Store username, not name
          greenPrice,
          orangePrice,
          phone: row.Phone || ''
        });
      }

      // If any errors, return detailed error information
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'CSV validation failed',
          totalRows: records.length,
          validRows: validatedCustomers.length,
          errorRows: errors.length,
          errors: errors
        });
      }

      // Insert all customers
      const insertedCustomers = await Customer.insertMany(validatedCustomers);

      res.json({
        message: `Successfully imported ${insertedCustomers.length} customers`,
        count: insertedCustomers.length,
        totalRows: records.length
      });
    } catch (error) {
      console.error('Import customers error:', error);
      res.status(500).json({ error: 'Failed to import customers' });
    }
  }
}
