import express from 'express';
const router = express.Router();

import {
    getUserProfile,
    uploadStudentCard,
    getPendingHSSV,
    verifyHSSVStatus
} from '../controllers/userController.js';

import { protect } from '../middlewares/authMiddleware.js';
import { admin } from '../middlewares/adminMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

// --- ROUTES CHO NGƯỜI DÙNG ---

// Xem hồ sơ cá nhân
router.get('/profile', protect, getUserProfile);

// Upload minh chứng HSSV (Sử dụng uploadMiddleware bạn đã viết)
router.post('/verify-hssv', protect, upload.single('studentCard'), uploadStudentCard);


// --- ROUTES CHO ADMIN ---

// Lấy danh sách đang chờ duyệt
router.get('/admin/pending-hssv', protect, admin, getPendingHSSV);

// Duyệt hoặc từ chối hồ sơ dựa trên ID người dùng
router.put('/admin/verify-hssv/:id', protect, admin, verifyHSSVStatus);

export default router;