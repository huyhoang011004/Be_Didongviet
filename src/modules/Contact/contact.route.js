import express from 'express';
import { contactController } from './contact.controller.js';
// Import thêm staffRole từ middleware auth của bạn
import { protect, adminRole, staffRole } from '../middleware/auth.js';

const router = express.Router();

// --- TỐI ƯU CẤU HÌNH MIDDLEWARE PHÂN QUYỀN VẬN HÀNH ---
// Cho phép cả Nhân viên (Staff/CSKH) và Admin truy cập hệ thống liên hệ
const staffAuth = [protect, (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Staff')) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Quyền truy cập bị từ chối!' });
}];

// ==========================================
// 1. PUBLIC ROUTES (Dành cho khách hàng)
// ==========================================

// Route công khai cho khách hàng truy cập website gửi form hỗ trợ/góp ý
router.post('/submit', contactController.submitContact);


// ==========================================
// 2. MANAGEMENT ROUTES (Dành cho nội bộ / Vận hành)
// ==========================================

// Nhân viên CSKH lấy danh sách tất cả các liên hệ để xử lý
router.get('/all', staffAuth, contactController.getContacts);

// Nhân viên cập nhật trạng thái liên hệ (Ví dụ: Đã gọi điện, Đã xử lý xong...)
router.patch('/update/:contactId', staffAuth, contactController.updateContactStatus);

//  Chỉ có Admin tối cao mới có quyền xóa dữ liệu liên hệ/khiếu nại của khách
router.delete('/delete/:contactId', protect, adminRole, contactController.deleteContact);

export default router;