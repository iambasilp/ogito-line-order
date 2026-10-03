import express from 'express';
import { godownTransferController } from '../controllers/godownTransferController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Enforce admin for all godown routes
router.use(authenticate);
router.use(requireAdmin);

// Godown Master Data
router.get('/locations', godownTransferController.getGodowns);
router.post('/locations', godownTransferController.createGodown);
router.put('/locations/:id', godownTransferController.updateGodown);
router.delete('/locations/:id', godownTransferController.deleteGodown);

// Transfers
router.get('/', godownTransferController.getAllTransfers);
router.post('/', godownTransferController.createTransfer);
router.put('/:id', godownTransferController.updateTransfer);

export default router;
