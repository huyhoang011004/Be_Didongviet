import express from 'express';
import {
    updateStudentProfile,
    uploadStudentCard,
    getPendingHSSV,
    verifyHSSVStatus
} from '../controllers/studentProfileController.js';

import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js'; // Middleware Multer xử lý tải ảnh hình ảnh

const router = express.Router();

// Người dùng cập nhật thông tin chữ hoặc tạo mới hồ sơ
router.post('/update', protect, updateStudentProfile);

// Người dùng upload ảnh minh chứng thẻ sinh viên
router.post('/upload-card', protect, upload.single('studentCardImage'), uploadStudentCard);


// Admin lấy danh sách các hồ sơ đang nằm trong hàng đợi duyệt
router.get('/pending', protect, getPendingHSSV);

// Admin phê duyệt/từ chối một hồ sơ dựa vào ID hồ sơ truyền trên URL
router.put('/verify/:id', protect, verifyHSSVStatus);

export default router;