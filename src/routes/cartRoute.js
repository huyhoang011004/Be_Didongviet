import express from 'express';
const router = express.Router();
import {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart
} from '../controllers/cartController.js';

// Tích hợp middleware xác thực người dùng
import { protect } from '../middlewares/authMiddleware.js';

// Tất cả các route giỏ hàng đều cần người dùng đăng nhập (protect)
// 1. Lấy thông tin giỏ hàng hiện tại của người dùng
// Phục vụ việc hiển thị danh sách sản phẩm chờ thanh toán tại trang Giỏ hàng [1]
router.get('/', protect, getCart);

// 2. Thêm sản phẩm vào giỏ hàng
// Áp dụng cho mọi danh mục: Điện thoại, Phụ kiện, Âm thanh hay Gia dụng Bear [1], [5]
router.post('/', protect, addToCart);

// 3. Cập nhật số lượng sản phẩm trong giỏ hàng
// Người dùng có thể tăng/giảm số lượng iPhone cũ hoặc phụ kiện trực tiếp [6], [7]
router.put('/', protect, updateCartItem);

// 4. Xóa một sản phẩm cụ thể khỏi giỏ hàng
// Ví dụ: Xóa một chiếc AirPods hoặc loa JBL ra khỏi danh sách chọn mua [8], [9]
router.delete('/:productId', protect, removeFromCart);

export default router;