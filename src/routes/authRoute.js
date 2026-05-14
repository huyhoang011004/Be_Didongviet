import express from 'express';
import { signIn, verifyOTP, resendOTP, signUp, googleLoginController } from '../controllers/authController.js';
import { validateUserFields } from '../middlewares/authMiddleware.js';
const router = express.Router();

// Route Đăng ký tài khoản mới
router.post('/signup', validateUserFields, signUp);

// Route Xác thực mã OTP để kích hoạt tài khoản
router.post('/verify-otp', verifyOTP);

// Route Gửi lại mã OTP
router.post('/resend-otp', resendOTP);

// Route Đăng nhập hệ thống
router.post('/signin', signIn);

// Route Đăng nhập bằng Google
router.post('/google-login', googleLoginController);

export default router;