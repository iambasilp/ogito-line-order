import express from 'express';
import { MarketStudyController } from '../controllers/marketStudyController';
import { authenticate, requireAdminOrCeo } from '../middleware/auth';

const router = express.Router();

// All market study routes require authentication
router.use(authenticate);

// ==========================================
// Product Catalogue Routes (Admin / CEO)
// ==========================================
router.get('/catalogue', MarketStudyController.getCatalogue);
router.post('/catalogue', requireAdminOrCeo, MarketStudyController.createCatalogueProduct);
router.put('/catalogue/reorder', requireAdminOrCeo, MarketStudyController.reorderCatalogue);
router.get('/catalogue/:id/usage', MarketStudyController.checkCatalogueUsage);
router.put('/catalogue/:id', requireAdminOrCeo, MarketStudyController.updateCatalogueProduct);
router.delete('/catalogue/:id', requireAdminOrCeo, MarketStudyController.deleteCatalogueProduct);

// ==========================================
// Survey Routes
// ==========================================
router.post('/surveys', MarketStudyController.createSurvey);
router.get('/surveys/:id', MarketStudyController.getSurveyById);
router.put('/surveys/:id', MarketStudyController.updateSurvey);
router.delete('/surveys/:id', MarketStudyController.deleteSurvey);
router.delete('/surveys/:surveyId/observations/:obsId', MarketStudyController.deleteObservation);

// ==========================================
// Observations & Analytics Routes
// ==========================================
router.get('/observations', MarketStudyController.getObservations);

// Default root routes
router.get('/', MarketStudyController.getObservations);
router.post('/', MarketStudyController.createSurvey);
router.delete('/:id', MarketStudyController.deleteSurvey);

export default router;
