import express from 'express';
import {
    signUp,
    verifyOTP,
    resendOTP
} from '#auth/SignUp/signup.auth.controller.js';
import {
    login,
    googleLoginController,
    forgotPassword,
    resetPassword
} from '#auth/LogIn/login.auth.controller.js';
import { validateUserFields } from '#middlewares/auth.middleware.js';
const router = express.Router();

// Route Đăng ký tài khoản mới
router.post('/signup', validateUserFields, signUp);

// Route Xác thực mã OTP để kích hoạt tài khoản
router.post('/verify-otp', verifyOTP);

// Route Gửi lại mã OTP
router.post('/resend-otp', resendOTP);

// ------------------------------------------------

// Route Đăng nhập hệ thống
router.post('/login', validateUserFields, login);

// Route Đăng nhập bằng Google
router.post('/google-login', googleLoginController);

// Route Quên mật khẩu
router.post('/forgot-password', forgotPassword);

// Route Đặt lại mật khẩu
router.post('/reset-password', resetPassword);

export default router;