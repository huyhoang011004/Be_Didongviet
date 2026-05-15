import express from 'express';
const router = express.Router();

import {
    getAllVouchers,
    getVoucherByCode
} from '#voucher/voucher.user.controller.js';

import {
    getAllVouchersAdmin,
    createVoucher,
    updateVoucher,
    deleteVoucher
} from '#voucher/voucher.admin.controller.js';

import { protect, adminRole } from '#middlewares/auth.middleware.js';

// --- ROUTES ADMIN ---
router.get('/admin', protect, adminRole, getAllVouchersAdmin);
router.post('/', protect, adminRole, createVoucher);
router.put('/:id', protect, adminRole, updateVoucher);
router.delete('/:id', protect, adminRole, deleteVoucher);

// --- ROUTES CÔNG KHAI ---
router.get('/', getAllVouchers);
router.get('/:code', getVoucherByCode);

export default router;
