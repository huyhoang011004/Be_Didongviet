import express from 'express';
const router = express.Router();
import {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart,
    applyVoucher,
} from '#cart/cart.controller.js';
import {
    getAllCarts,
    deleteCart
} from '#cart/cart.admin.controller.js';

import { protect, adminRole } from '#middlewares/auth.middleware.js';

// --- ADMIN ROUTES ---
// Xóa giỏ hàng của user: DELETE /api/cart/admin/:userId
router.delete('/admin/:userId', adminRole, deleteCart);

// Lấy tất cả giỏ hàng: GET /api/cart/admin/all
router.get('/admin/all', adminRole, getAllCarts);

// --- USER ROUTES ---
// Lấy giỏ hàng của mình: GET /api/cart
router.get('/', protect, getCart);

// Thêm sản phẩm vào giỏ: POST /api/cart
router.post('/', protect, addToCart);

// Cập nhật số lượng: PUT /api/cart
router.put('/', protect, updateCartItem);

// Áp dụng mã giảm giá: POST /api/cart/apply-voucher
router.post('/apply-voucher', protect, applyVoucher);

// Xóa phân loại cụ thể: DELETE /api/cart/:productId/:variantId
router.delete('/:productId/:variantId', protect, removeFromCart);

export default router;