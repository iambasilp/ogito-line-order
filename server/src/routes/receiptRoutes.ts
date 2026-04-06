import express from 'express';
import { getReceipts, createReceipt, deleteReceipt } from '../controllers/receiptController';
import { authenticate, requireAdminOrDriver, requireAdmin } from '../middleware/auth';


const router = express.Router();

// All receipt routes require authentication
router.use(authenticate);

// List and Create are for Admin and Driver
router.get('/', requireAdminOrDriver, getReceipts);
router.post('/', requireAdminOrDriver, createReceipt);

// Delete is strictly Admin only
router.delete('/:id', requireAdmin, deleteReceipt);


export default router;
