import express from 'express';
const router = express.Router();
import {
    calculateShippingFee,
    fetchProvinces,
    fetchDistricts,
    fetchWards,
    fetchShippingOrderInfo,
} from '#ghn/ghn.controller.js';

import { protect, staffRole } from '#middlewares/auth.middleware.js';

// Tính phí vận chuyển (public - dùng khi checkout)
router.post('/fee', calculateShippingFee);

// Lookup dữ liệu địa chính GHN
router.get('/provinces', fetchProvinces);
router.post('/districts', fetchDistricts);
router.post('/wards', fetchWards);

// Tra cứu vận đơn (yêu cầu đăng nhập)
router.get('/order/:orderCode', protect, fetchShippingOrderInfo);

export default router;