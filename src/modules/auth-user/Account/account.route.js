import express from 'express';
const router = express.Router();

import {
    getUserProfile,
    updateUserProfile,
    deleteUserProfile,
    changePassword,
    updateAvatar
} from '#account/account.controller.js';

import {
    getAllUsersForAdmin,
    createUserByAdmin,
    updateUserByAdmin,
    softDeleteUserByAdmin,
    deleteUserByAdmin
} from '#account/account.admin.controller.js';

import { protect, adminRole } from '#middlewares/auth.middleware.js';
import upload from '#middlewares/upload.middleware.js';


// --- ROUTES CÔNG KHAI ---

// Xem hồ sơ cá nhân
router.get('/profile', protect, getUserProfile);

// Cập nhật hồ sơ cá nhân
router.put('/profile', protect, updateUserProfile);

// Upload avatar
router.put('/profile/avatar', protect, upload.single('avatar'), updateAvatar);

// Đổi mật khẩu
router.put('/change-password', protect, changePassword);

// Xóa hồ sơ cá nhân
router.delete('/profile', protect, deleteUserProfile);

// --- ROUTES QUẢN TRỊ ---

// Xem tất cả người dùng
router.get('/admin/get-all-users', adminRole, getAllUsersForAdmin);

// Tạo người dùng admin hoặc staff
router.post('/admin/create', adminRole, createUserByAdmin);

// Cập nhật thông tin người dùng (bao gồm thăng chức/hạ chức và khôi phục tài khoản đã xóa mềm)
router.put('/admin/update/:id', adminRole, updateUserByAdmin);

// Xóa mềm người dùng
router.patch('/admin/soft-delete/:id', adminRole, softDeleteUserByAdmin);

// Xóa người dùng (xóa vĩnh viễn)
router.delete('/admin/delete/:id', adminRole, deleteUserByAdmin);

export default router;