import express from 'express';
import { MarketStudyController } from '../controllers/marketStudyController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All market study routes require authentication
router.use(authenticate);

// GET /api/market-study
router.get('/', MarketStudyController.getMarketStudies);

// POST /api/market-study
router.post('/', MarketStudyController.createMarketStudy);

// PUT /api/market-study/:id
router.put('/:id', MarketStudyController.updateMarketStudy);

// DELETE /api/market-study/:id
router.delete('/:id', MarketStudyController.deleteMarketStudy);

export default router;
