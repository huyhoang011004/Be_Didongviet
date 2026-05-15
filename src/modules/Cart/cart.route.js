import express from 'express';
const router = express.Router();
import {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart,
    applyVoucher,
    getAllCarts,
    deleteCart
} from '#cart/cart.controller.js';
import { protect, adminRole } from '#middlewares/auth.middleware.js';

// --- USER ROUTES ---
// 1. Lấy giỏ hàng của mình: GET /api/cart
router.get('/', protect, getCart);

// 2. Thêm sản phẩm vào giỏ: POST /api/cart
router.post('/', protect, addToCart);

// 3. Cập nhật số lượng: PUT /api/cart
router.put('/', protect, updateCartItem);

// 4. Xóa phân loại cụ thể: DELETE /api/cart/:productId/:variantId
router.delete('/:productId/:variantId', protect, removeFromCart);

// 5. Áp dụng mã giảm giá: POST /api/cart/apply-voucher
router.post('/apply-voucher', protect, applyVoucher);

// --- ADMIN ROUTES ---
// 6. Lấy tất cả giỏ hàng: GET /api/cart/admin/all
router.get('/admin/all', protect, adminRole, getAllCarts);

// 7. Xóa giỏ hàng của user: DELETE /api/cart/admin/:userId
router.delete('/admin/:userId', protect, adminRole, deleteCart);

export default router;