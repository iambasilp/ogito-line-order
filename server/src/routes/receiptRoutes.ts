import express from 'express';
import { getReceipts, createReceipt, deleteReceipt, updateReceipt } from '../controllers/receiptController';
import { authenticate, requireAdmin, requireAdminOrDriver } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Everyone authenticated can view and create receipts (role-based filtering happens in controller)
router.get('/', getReceipts);
router.post('/', createReceipt);
router.put('/:id', updateReceipt);
router.delete('/:id', deleteReceipt);

export default router;
