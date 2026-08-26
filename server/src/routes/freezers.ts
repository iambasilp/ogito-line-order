import express from 'express';
import { protect } from '../middleware/auth';
import { 
  getFreezers, 
  getFreezerById, 
  createFreezer, 
  updateFreezer, 
  deleteFreezer 
} from '../controllers/freezersController';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/')
  .get(getFreezers)
  .post(createFreezer);

router.route('/:id')
  .get(getFreezerById)
  .put(updateFreezer)
  .delete(deleteFreezer);

export default router;
