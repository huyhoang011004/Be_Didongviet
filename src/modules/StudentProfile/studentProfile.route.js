import express from 'express';
import {
    uploadStudentCard,
    updateStudentProfile,
    getMyStudentProfile,
    getPendingHSSV,
    verifyHSSVStatus
} from '#studentProfile/studentProfile.controller.js';

import { protect, adminRole } from '#middlewares/auth.middleware.js';
import upload from '#middlewares/upload.middleware.js';

const router = express.Router();

// --- TỐI ƯU CẤU HÌNH MIDDLEWARE PHÂN QUYỀN VẬN HÀNH ---
// Cho phép cả Nhân viên (Staff) và Admin thực hiện kiểm duyệt
const staffAuth = [protect, (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Staff')) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Quyền truy cập bị từ chối!' });
}];

// ==========================================
// 1. CLIENT ROUTES (Dành cho khách hàng)
// ==========================================

// Người dùng upload ảnh minh chứng thẻ sinh viên
router.post('/upload-card', protect, upload.single('studentCardImage'), uploadStudentCard);

// Người dùng cập nhật thông tin chữ hoặc tạo mới hồ sơ
router.post('/update', protect, updateStudentProfile);

// Người dùng lấy thông tin hồ sơ HSSV hiện tại của mình
router.get('/me', protect, getMyStudentProfile);


// ==========================================
// 2. MANAGEMENT ROUTES (Dành cho bộ phận vận hành / Nhân viên kiểm duyệt)
// ==========================================

// Nhân viên lấy danh sách các hồ sơ đang nằm trong hàng đợi duyệt
router.get('/management/pending', staffAuth, getPendingHSSV);

// Nhân viên hoặc Admin trực tiếp phê duyệt / từ chối hồ sơ thẻ sinh viên
router.put('/management/verify/:id', staffAuth, verifyHSSVStatus);

export default router;