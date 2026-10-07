import express from 'express';
import { FreezersController } from '../controllers/freezersController';
import { authenticate, requireAdminOrCeo } from '../middleware/auth';

const router = express.Router();

// All freezer operations should be admin/ceo only
router.use(authenticate, requireAdminOrCeo);

router.get('/', FreezersController.getAllFreezers);
router.post('/', FreezersController.createFreezer);
router.put('/:id', FreezersController.updateFreezer);
router.delete('/:id', FreezersController.deleteFreezer);

export default router;
