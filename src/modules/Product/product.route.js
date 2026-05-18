import express from 'express';
const router = express.Router();

import {
    getAllProducts,
    getProductsByCategory,
    getProductByIdAndSlug,
    getTradeInProducts,
    getRelatedProducts,
    getProductBySKU,
} from '#product/product.controller.js';
import {
    createProduct,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
    setThumbnail,
    replaceImage,
    deleteImage,
    reorderImages
} from '#product/product.admin.controller.js';
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

// Lấy danh sách sản phẩm sắp hết hàng (dành cho Admin theo dõi, nhưng cũng có thể mở cho khách để họ biết sản phẩm nào sắp hết)
router.get('/low-stock', adminAuth, getLowStockProducts);

// Chi tiết sản phẩm (Hỗ trợ cả ID và Slug)
router.get('/:id', getProductByIdAndSlug);


// ==========================================
// 2. ADMIN ROUTES (Yêu cầu quyền Quản trị viên)
// ==========================================

router.use(protect, adminRole);

const productUpload = upload.fields([
    {
        name: 'images',
        maxCount: 6
    },
    {
        name: 'variantImages',
        maxCount: 20
    }
]);

router.route('/')
    .post(productUpload, createProduct);

router.route('/:id')
    .put(productUpload, updateProduct)
    .delete(deleteProduct);

router.route('/:id/images/:imageId')
    .put(upload.single('image'), replaceImage)
    .delete(deleteImage);

router.route('/:id/images/reorder')
    .put(reorderImages);

router.route('/:id/images/:imageId/thumbnail')
    .put(setThumbnail);

export default router;