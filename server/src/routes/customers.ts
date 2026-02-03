import express from 'express';
import { CustomersController } from '../controllers/customersController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all customers with pagination and filtering
router.get('/', authenticate, CustomersController.getAllCustomers);

// Get single customer
router.get('/:id', authenticate, CustomersController.getCustomerById);

// Create customer (admin only)
router.post('/', authenticate, requireAdmin, CustomersController.createCustomer);

// Update customer (admin only)
router.put('/:id', authenticate, requireAdmin, CustomersController.updateCustomer);

// Delete customer (admin only)
router.delete('/:id', authenticate, requireAdmin, CustomersController.deleteCustomer);

// Import customers from CSV (admin only)
router.post('/import', authenticate, requireAdmin, CustomersController.importCustomers);

export default router;
