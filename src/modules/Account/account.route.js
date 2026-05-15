import express from 'express';
const router = express.Router();

import {
    getUserProfile,
    updateUserProfile,
    deleteUserProfile
} from '#account/Admin/User/account.user.controller.js';

import {
    getAllUsersForAdmin,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin
} from '#account/Admin/account.controller.js';

import { protect, adminRole } from '#middlewares/auth.middleware.js';


// --- ROUTES CÔNG KHAI ---

// Xem hồ sơ cá nhân
router.get('/profile', protect, getUserProfile);

// Cập nhật hồ sơ cá nhân
router.put('/profile', protect, updateUserProfile);

// Xóa hồ sơ cá nhân
router.delete('/profile', protect, deleteUserProfile);

// --- ROUTES QUẢN TRỊ ---

// Xem tất cả người dùng
router.get('/admin/get-all-users', adminRole, getAllUsersForAdmin);

// Tạo người dùng admin hoặc staff
router.post('/admin/create', adminRole, createUserByAdmin);

// Cập nhật thông tin người dùng (bao gồm thăng chức/hạ chức và khôi phục tài khoản đã xóa mềm)
router.put('/admin/update/:id', adminRole, updateUserByAdmin);

// Xóa người dùng (xóa vĩnh viễn)
router.delete('/admin/delete/:id', adminRole, deleteUserByAdmin);

export default router;