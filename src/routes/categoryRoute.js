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

import { protect, adminRole } from '../middlewares/authMiddleware.js';

// --- ROUTES CÔNG KHAI ---

// Lấy toàn bộ cây danh mục cho Menu chính (Điện thoại, Tablet, Mac...)
router.get('/', getAllCategories);

// Lấy danh mục con thuộc nhóm "Máy cũ giá rẻ"
router.get('/used-special', getUsedCategories);

// Lấy chi tiết danh mục theo Slug (SEO Friendly)
router.get('/slug/:slug', getCategoryBySlug); // Ví dụ: /api/categories/slug/dien-thoai


// --- ROUTES QUẢN TRỊ ---
// Yêu cầu: Phải đăng nhập (protect) và có quyền (admin)

router.route('/')
    .post(adminRole, createCategory);

router.route('/:id')
    .put(adminRole, updateCategory)
    .delete(adminRole, deleteCategory);

export default router;