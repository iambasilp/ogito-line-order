import express from 'express';
import { PaymentCollectionsController } from '../controllers/paymentCollectionsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication (drivers, admins, ceos, sales)
router.use(authenticate);

// Get collections (with filters)
router.get('/', PaymentCollectionsController.getCollections);

// Get collections for today (quick lookup for daily orders view)
router.get('/today', PaymentCollectionsController.getTodayCollections);

// Record a new payment collection
router.post('/', PaymentCollectionsController.createCollection);

// Update a payment collection
router.put('/:id', PaymentCollectionsController.updateCollection);

// Delete a payment collection
router.delete('/:id', PaymentCollectionsController.deleteCollection);

export default router;
