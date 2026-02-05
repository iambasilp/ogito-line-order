import express from 'express';
import { OrdersController } from '../controllers/ordersController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get orders (all for admin, own for users)
router.get('/', authenticate, OrdersController.getAllOrders);

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

// Update order (admin only)
router.put('/:id', authenticate, requireAdmin, OrdersController.updateOrder);

// Delete order (admin only)
router.delete('/:id', authenticate, requireAdmin, OrdersController.deleteOrder);

export default router;
