import express from 'express';
const router = express.Router();
import {
    addOrderItems,
    updateOrderToPaid,
    getAllOrders,
    updateOrderToDelivered,
    cancelOrder,
    trackOrderPublic,
    checkoutPreview
} from '#order/order.controller.js';
import { protect, adminRole } from '#middlewares/auth.middleware.js';

// --- Khách hàng ---
router.post('/', protect, addOrderItems);
router.get('/track', trackOrderPublic);
router.post('/preview', protect, checkoutPreview);
router.put('/:id/pay', protect, updateOrderToPaid);
router.put('/:id/cancel', protect, cancelOrder);

// --- Admin ---
router.get('/', protect, adminRole, getAllOrders);
router.put('/:id/deliver', protect, adminRole, updateOrderToDelivered);

export default router;