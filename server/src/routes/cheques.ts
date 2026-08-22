import express from 'express';
import { ChequesController } from '../controllers/chequesController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Apply authentication and admin middleware to all cheque routes
router.use(authenticate, requireAdmin);

// Get all cheques (with search, filter, and summary stats)
router.get('/', ChequesController.getCheques);

// Create a new cheque
router.post('/', ChequesController.createCheque);

// Update a cheque
router.put('/:id', ChequesController.updateCheque);

// Delete a cheque
router.delete('/:id', ChequesController.deleteCheque);

export default router;
