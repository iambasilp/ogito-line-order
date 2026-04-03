import express from 'express';
import { getReceipts, createReceipt, deleteReceipt } from '../controllers/receiptController';
import { authenticate, requireAdminOrDriver } from '../middleware/auth';

const router = express.Router();

// All receipt routes require Admin or Driver role
router.use(authenticate);
router.use(requireAdminOrDriver);

router.get('/', getReceipts);
router.post('/', createReceipt);
router.delete('/:id', deleteReceipt);

export default router;
