import express from 'express';
import {
    updateStudentProfile,
    uploadStudentCard,
    getOwnStudentProfile,
    getPendingHSSV,
    verifyHSSVStatus
} from '#studentProfile/studentProfile.controller.js';

import { protect, adminRole } from '#middlewares/auth.middleware.js';
import upload from '#middlewares/upload.middleware.js';

const router = express.Router();

// Người dùng cập nhật thông tin chữ hoặc tạo mới hồ sơ
router.post('/update', protect, updateStudentProfile);

// Người dùng upload ảnh minh chứng thẻ sinh viên
router.post('/upload-card', protect, upload.single('studentCardImage'), uploadStudentCard);

// Người dùng lấy thông tin hồ sơ HSSV hiện tại của mình
router.get('/me', protect, getOwnStudentProfile);

// Admin lấy danh sách các hồ sơ đang nằm trong hàng đợi duyệt
router.get('/admin/pending', protect, adminRole, getPendingHSSV);

// Admin phê duyệt/từ chối một hồ sơ dựa vào ID hồ sơ truyền trên URL
router.put('/admin/verify/:id', protect, adminRole, verifyHSSVStatus);

export default router;