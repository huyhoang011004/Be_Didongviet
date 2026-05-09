import express from 'express';
import { signIn, signUp } from '../controllers/authController.js';

const router = express.Router();

// 1. Đăng ký tài khoản mới
router.post('/signup', signUp);

// 2. Đăng nhập hệ thống
router.post('/signin', signIn);

export default router;