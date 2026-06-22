import express from 'express';
import { OrdersController } from '../controllers/ordersController';
import { authenticate, requireAdmin, requireAdminOrDriver, requireDriver } from '../middleware/auth';

const router = express.Router();

// Get orders (all for admin, own for users)
router.get('/', authenticate, OrdersController.getAllOrders);

// Get historical month-over-month trend (admin only)
router.get('/monthly-trend', authenticate, requireAdmin, OrdersController.getMonthlyTrend);

// Get anomaly analytics (admin only)
router.get('/analytics/anomalies', authenticate, requireAdmin, OrdersController.getAnomalies);

// Get route party breakdown (drill-down) — available to salesmen (shows their customers only)
router.get('/analytics/route-breakdown', authenticate, OrdersController.getRouteBreakdown);

// Get executive party breakdown (drill-down) — admin only
router.get('/analytics/executive-breakdown', authenticate, requireAdmin, OrdersController.getExecutiveBreakdown);

// Get analytics (route-wise and salesman-wise)
router.get('/analytics', authenticate, OrdersController.getAnalytics);

// Create order
router.post('/', authenticate, OrdersController.createOrder);

// Delete last 30 days orders (admin only)
router.delete('/bulk/last-30-days', authenticate, requireAdmin, OrdersController.deleteLast30DaysOrders);

// Delete orders older than current month and previous month (admin only)
router.delete('/bulk/old-data', authenticate, requireAdmin, OrdersController.deleteOldOrders);

// Export orders to CSV
router.get('/export/csv', authenticate, OrdersController.exportToCSV);

// Create message for order
router.post('/:id/messages', authenticate, OrdersController.createMessage);

// Update message text (creator only)
router.patch('/:id/messages/:messageId', authenticate, OrdersController.editMessage);

// Delete message (creator or admin)
router.delete('/:id/messages/:messageId', authenticate, OrdersController.deleteMessage);

// Update message status (admin only)
router.patch('/:id/messages/:messageId/status', authenticate, requireAdmin, OrdersController.updateMessageStatus);

// Update order (admin or driver)
router.put('/:id', authenticate, requireAdminOrDriver, OrdersController.updateOrder);

// Update billing status (admin only)
router.patch('/:id/billing-status', authenticate, requireAdmin, OrdersController.updateBillingStatus);

// Update cancellation status (admin or driver)
router.patch('/:id/cancel-status', authenticate, requireAdminOrDriver, OrdersController.updateCancellationStatus);

// Update delivery status (driver only)
router.patch('/:id/delivery-status', authenticate, requireDriver, OrdersController.updateDeliveryStatus);

// Delete order (admin only)
router.delete('/:id', authenticate, requireAdmin, OrdersController.deleteOrder);

export default router;
