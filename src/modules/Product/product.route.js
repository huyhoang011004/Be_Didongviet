import express from 'express';
const router = express.Router();

import {
    getAllProducts,
    getProductsByCategory,
    getProductByIdAndSlug,
    getTradeInProducts,
    getRelatedProducts,
    getProductBySKU,
    searchProducts
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

// Khởi tạo thêm middleware staffRole từ file auth.middleware
import { protect, adminRole, staffRole } from '#middlewares/auth.middleware.js';
import upload from '#middlewares/upload.middleware.js';

// --- TỐI ƯU CẤU HÌNH MIDDLEWARE PHÂN QUYỀN ---
const adminAuth = [protect, adminRole];
// Tổ hợp quyền vận hành: Cho phép cả Nhân viên (Staff) và Admin truy cập
const staffAuth = [protect, (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Staff')) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Quyền truy cập bị từ chối!' });
}];

// ==========================================
// 1. PUBLIC ROUTES (Dành cho khách hàng)
// ==========================================

router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/trade-in', getTradeInProducts);
router.get('/category/:categorySlug', getProductsByCategory);
router.get('/:id/related', getRelatedProducts);
router.get('/sku/:sku', getProductBySKU);
router.get('/:id', getProductByIdAndSlug);


// ==========================================
// 2. STAFF & ADMIN ROUTES (Vận hành & Quản lý sản phẩm)
// ==========================================

// Cấu hình upload đa trường dữ liệu cho hình ảnh sản phẩm
const productUpload = upload.fields([
    { name: 'images', maxCount: 6 },
    { name: 'variantImages', maxCount: 20 }
]);

// Chuyển sang quyền staffAuth: Cho phép nhân viên kiểm tra kho để kịp báo nhập hàng
router.get('/low-stock', staffAuth, getLowStockProducts);

// Các tác vụ thêm/sửa thông tin sản phẩm (Nhân viên thao tác hàng ngày)
router.route('/')
    .post(staffAuth, productUpload, createProduct);

router.route('/:id')
    .put(staffAuth, productUpload, updateProduct)
    .delete(adminAuth, deleteProduct); // Chỉ có Admin mới được phép xóa hẳn sản phẩm

// Các tác vụ cập nhật, quản lý media sản phẩm giao cho Nhân viên
router.route('/:id/images/:imageId')
    .put(staffAuth, upload.single('image'), replaceImage)
    .delete(staffAuth, deleteImage);

router.route('/:id/images/reorder')
    .put(staffAuth, reorderImages);

router.route('/:id/images/:imageId/thumbnail')
    .put(staffAuth, setThumbnail);

export default router;