import express from 'express';
import { contactController } from './contact.controller.js';
import { protect, adminRole, staffRole } from '#middlewares/auth.middleware.js';

const router = express.Router();

// ==========================================
// 1. PUBLIC ROUTES (Dành cho khách hàng)
// ==========================================

// Route công khai cho khách hàng truy cập website gửi form hỗ trợ/góp ý
router.post('/submit', contactController.submitContact);


// ==========================================
// 2. MANAGEMENT ROUTES (Dành cho nội bộ / Vận hành)
// ==========================================

// Nhân viên CSKH lấy danh sách tất cả các liên hệ để xử lý
router.get('/all', staffRole, contactController.getContacts);

// Nhân viên cập nhật trạng thái liên hệ (Ví dụ: Đã gọi điện, Đã xử lý xong...)
router.put('/update/:contactId', staffRole, contactController.updateContactStatus);

// Cả nhân viên và người tạo phiếu (protect) đều có quyền gọi API hủy này (kiểm tra phân quyền ở controller)
router.patch('/soft-delete/:contactId', protect, contactController.softDeleteContact);

//  Chỉ có Admin tối cao mới có quyền xóa dữ liệu liên hệ/khiếu nại của khách
router.delete('/delete/:contactId', protect, adminRole, contactController.deleteContact);

export default router;