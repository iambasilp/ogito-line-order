import express from 'express';
import { parse } from 'csv-parse/sync';
import Customer from '../models/Customer';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all customers
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get single customer
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
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
});

// Create customer (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Import customers from CSV (admin only)
router.post('/import', authenticate, requireAdmin, async (req: AuthRequest, res) => {
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

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 because row 1 is header and arrays are 0-indexed

      // Validate required fields
      if (!row.Name || !row.Route || !row.SalesExecutive) {
        errors.push(`Row ${rowNum}: Missing required fields (Name, Route, or SalesExecutive)`);
        continue;
      }

      // Parse and validate prices
      const greenPrice = parseFloat(row.GreenPrice?.replace(/[₹,]/g, '') || '0');
      const orangePrice = parseFloat(row.OrangePrice?.replace(/[₹,]/g, '') || '0');

      if (isNaN(greenPrice) || isNaN(orangePrice)) {
        errors.push(`Row ${rowNum}: Invalid price format`);
        continue;
      }

      if (greenPrice < 0 || orangePrice < 0) {
        errors.push(`Row ${rowNum}: Prices cannot be negative`);
        continue;
      }

      validatedCustomers.push({
        name: row.Name,
        route: row.Route,
        salesExecutive: row.SalesExecutive,
        greenPrice,
        orangePrice,
        phone: row.Phone || ''
      });
    }

    // If any errors, abort
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'CSV validation failed. Please fix the following errors and try again:',
        details: errors 
      });
    }

    // Insert all customers
    const insertedCustomers = await Customer.insertMany(validatedCustomers);

    res.json({ 
      message: `Successfully imported ${insertedCustomers.length} customers`,
      count: insertedCustomers.length 
    });
  } catch (error) {
    console.error('Import customers error:', error);
    res.status(500).json({ error: 'Failed to import customers' });
  }
});

export default router;
