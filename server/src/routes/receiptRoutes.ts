import express from 'express';
import { getReceipts, createReceipt, deleteReceipt, updateReceipt } from '../controllers/receiptController';
import { authenticate, requireAdmin, requireAdminOrDriver } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Driver can view and create receipts, Admin can do all including delete/update
router.get('/', requireAdminOrDriver, getReceipts);
router.post('/', requireAdminOrDriver, createReceipt);
router.put('/:id', requireAdmin, updateReceipt);
router.delete('/:id', requireAdmin, deleteReceipt);

export default router;
