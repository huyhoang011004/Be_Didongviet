import express from 'express';
const router = express.Router();
import {
    addOrderItems,
    updateOrderToPaid,
    getAllOrders,
    searchOrders,
    updateOrderToDelivered,
    cancelOrder,
    trackOrderPublic,
    checkoutPreview
} from '#order/order.controller.js';

import { protect, adminRole, staffRole } from '#middlewares/auth.middleware.js';

// --- TỐI ƯU CẤU HÌNH MIDDLEWARE PHÂN QUYỀN VẬN HÀNH ---

// ==========================================
// 1. CLIENT & PUBLIC ROUTES (Khách hàng & Tra cứu public)
// ==========================================

// Khách hàng tạo đơn hàng mới và xem trước khi checkout
router.post('/', protect, addOrderItems);
router.post('/preview', protect, checkoutPreview);

// Khách hàng tự thanh toán hoặc tự hủy đơn của chính họ
router.put('/:id/pay', protect, updateOrderToPaid);
router.put('/:id/cancel', protect, cancelOrder);

// Tra cứu nhanh (Dùng cho thanh Search tổng và trang theo dõi tiến độ đơn hàng công khai)
router.get('/search', searchOrders);
router.get('/track', trackOrderPublic);


// ==========================================
// 2. MANAGEMENT ROUTES (Bộ phận Vận hành / Nhân viên xử lý đơn)
// ==========================================

// Nhân viên có thể xem danh sách tất cả đơn hàng để chuẩn bị đóng gói
router.get('/', staffRole, getAllOrders);

// Nhân viên kho/giao vận cập nhật trạng thái đơn hàng sang "Đang giao hàng/Đã giao"
router.put('/:id/deliver', staffRole, updateOrderToDelivered);

export default router;