import express from 'express';
const router = express.Router();
import {
    addOrderItems,
    updateOrderToPaid,
    getAllOrders,
    updateOrderToDelivered,
    cancelOrder,
    trackOrderPublic

} from '#order/order.controller.js';
import { protect } from '#middlewares/auth.middleware.js';

// --- Khách hàng ---
router.post('/', protect, addOrderItems);
router.put('/:id/pay', protect, updateOrderToPaid);
router.put('/:id/cancel', protect, cancelOrder);
router.get('/track', trackOrderPublic); // Theo dõi đơn hàng công khai (không cần auth)

// --- Admin ---
router.get('/', protect, getAllOrders); // Xem toàn bộ đơn hàng hệ thống
router.put('/:id/deliver', protect, updateOrderToDelivered); // Xác nhận đã giao hàng

export default router;