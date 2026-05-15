import express from 'express';
const router = express.Router();

import {
    getAllProducts,
    getProductsByCategory,
    getProductById,
    getTradeInProducts,
    getRelatedProducts,
    getProductBySKU,
    createProduct,
    updateProduct,
    deleteProduct
} from '#product/product.controller.js';

import { protect, adminRole } from '#middlewares/auth.middleware.js';
import upload from '#middlewares/upload.middleware.js';

// --- CẤU HÌNH MIDDLEWARE ---
const adminAuth = [protect, adminRole]; // Middleware xác thực Admin

// ==========================================
// 1. PUBLIC ROUTES (Dành cho khách hàng)
// ==========================================

// Lấy danh sách sản phẩm (có thể kèm filter, search, pagination)
router.get('/', getAllProducts);

// Các chương trình khuyến mãi đặc thù Di Động Việt
router.get('/trade-in', getTradeInProducts);

// Lấy theo danh mục hoặc sản phẩm liên quan
router.get('/category/:categorySlug', getProductsByCategory);
router.get('/:id/related', getRelatedProducts);

// Tìm kiếm theo SKU (Khách cũng có thể check cấu hình qua SKU)
router.get('/sku/:sku', getProductBySKU);

// Chi tiết sản phẩm (Hỗ trợ cả ID và Slug)
router.get('/:identifier', getProductById);


// ==========================================
// 2. ADMIN ROUTES (Yêu cầu quyền Quản trị viên)
// ==========================================

// Áp dụng middleware bảo mật cho toàn bộ các route định nghĩa phía dưới
router.use(protect, adminRole);

/**
 * Quản lý thông tin sản phẩm
 */
router.post('/', upload.single('image'), createProduct);

router.route('/:identifier')
    .put(upload.single('image'), updateProduct)
    .delete(deleteProduct);

export default router;