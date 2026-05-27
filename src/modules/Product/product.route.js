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
    deleteSoftProduct,
    getLowStockProducts,
    setThumbnail,
    replaceImage,
    deleteImage,
    reorderImages
} from '#product/product.admin.controller.js';

// Khởi tạo thêm middleware staffRole từ file auth.middleware
import { protect, adminRole, staffRole } from '#middlewares/auth.middleware.js';
import upload from '#middlewares/upload.middleware.js';

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
router.get('/low-stock', staffRole, getLowStockProducts);

// Các tác vụ thêm/sửa thông tin sản phẩm (Nhân viên thao tác hàng ngày)
router.route('/')
    .post(staffRole, productUpload, createProduct);

router.route('/:id')
    .put(staffRole, productUpload, updateProduct)
    .patch(staffRole, deleteSoftProduct) // Xóa mềm: Ẩn sản phẩm khỏi trang chủ nhưng vẫn giữ dữ liệu để có thể khôi phục nếu cần
    .delete(adminRole, deleteProduct); // Chỉ có Admin mới được phép xóa hẳn sản phẩm

// Các tác vụ cập nhật, quản lý media sản phẩm giao cho Nhân viên
router.route('/:id/images/:imageId')
    .put(staffRole, upload.single('image'), replaceImage)
    .delete(staffRole, deleteImage);

router.route('/:id/images/reorder')
    .put(staffRole, reorderImages);

router.route('/:id/images/:imageId/thumbnail')
    .put(staffRole, setThumbnail);

export default router;