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

// Nhân viên có thể hủy phiếu liên hệ (Xóa mềm bằng cách đổi trạng thái)
router.patch('/soft-delete/:contactId', staffRole, contactController.softDeleteContact);

//  Chỉ có Admin tối cao mới có quyền xóa dữ liệu liên hệ/khiếu nại của khách
router.delete('/delete/:contactId', protect, adminRole, contactController.deleteContact);

export default router;