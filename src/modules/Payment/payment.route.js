import express from 'express';
const router = express.Router();
import {
    createMoMoOrder,
    handleMoMoIPN,
    handleMoMoReturn,
    createVNPayOrder,
    handleVNPayIPN,
    handleVNPayReturn,
} from './payment.controller.js';
import { protect } from '#middlewares/auth.middleware.js';

// ============================================================
// CLIENT ROUTES — Tạo thanh toán (cần đăng nhập)
// ============================================================
router.post('/momo', protect, createMoMoOrder);
router.post('/vnpay', protect, createVNPayOrder);

// ============================================================
// IPN CALLBACKS — Từ cổng thanh toán gọi về (server-to-server, KHÔNG cần auth)
// ============================================================
router.post('/momo/ipn', handleMoMoIPN);
router.get('/vnpay/ipn', handleVNPayIPN);

// ============================================================
// RETURN URL — User redirect về sau khi thanh toán (KHÔNG cần auth)
// ============================================================
router.get('/vnpay/return', handleVNPayReturn);
router.get('/momo/return', handleMoMoReturn);

export default router;