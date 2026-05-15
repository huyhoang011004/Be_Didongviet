import express from 'express';
const router = express.Router();
import {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart,
    applyVoucher
} from '#cart/cart.controller.js';
import { protect } from '#middlewares/auth.middleware.js';

// 1. Lấy giỏ hàng: GET /api/cart
router.get('/', protect, getCart);

// 2. Thêm sản phẩm: POST /api/cart
router.post('/', protect, addToCart);

// 3. Cập nhật số lượng: PUT /api/cart
router.put('/', protect, updateCartItem);

// 4. Xóa phân loại cụ thể: DELETE /api/cart/:productId/:variantId
// Sửa đổi ở đây để định danh đúng phiên bản cần xóa
router.delete('/:productId/:variantId', protect, removeFromCart);

// 5. Áp dụng mã giảm giá: POST /api/cart/apply-voucher
router.post('/apply-voucher', protect, applyVoucher);

export default router;