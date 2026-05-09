import express from 'express';
const router = express.Router();

import {
    getAllCategories,
    getCategoryBySlug,
    createCategory,
    updateCategory,
    deleteCategory,
    getUsedCategories
} from '../controllers/categoryController.js';

import { protect } from '../middlewares/authMiddleware.js';
import { admin } from '../middlewares/adminMiddleware.js';

// --- ROUTES CÔNG KHAI (Dành cho khách hàng) ---

// Lấy toàn bộ cây danh mục cho Menu chính (Điện thoại, Tablet, Mac...)
router.get('/', getAllCategories);

// Lấy danh mục con thuộc nhóm "Máy cũ giá rẻ"
router.get('/used-special', getUsedCategories);

// Lấy chi tiết danh mục theo Slug (SEO Friendly)
router.get('/slug/:slug', getCategoryBySlug);


// --- ROUTES QUẢN TRỊ (Dành cho Admin Di Động Việt) ---
// Yêu cầu: Phải đăng nhập (protect) và có quyền (admin)

router.route('/')
    .post(protect, admin, createCategory); // Thêm dòng sản phẩm mới

router.route('/:id')
    .put(protect, admin, updateCategory)    // Sửa tên, ảnh hoặc thương hiệu danh mục
    .delete(protect, admin, deleteCategory); // Xóa danh mục (Chỉ khi không còn danh mục con)

export default router;