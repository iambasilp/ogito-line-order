import express from 'express';
import { godownTransferController } from '../controllers/godownTransferController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Enforce admin for all godown routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/', godownTransferController.getAllTransfers);
router.post('/', godownTransferController.createTransfer);
router.put('/:id', godownTransferController.updateTransfer);

export default router;
