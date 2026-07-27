import express from 'express';
const router = express.Router();

import {
    getAnalytics,
    getBestSellingProducts,
    getChartData,
    getOrderStatusSummary,
    getLowStockProducts,
    getOldStockProducts,
    getBranchRanking,
    getDashboardOverview
} from './analytics.controller.js';

import { adminRole } from '#middlewares/auth.middleware.js';

// Tất cả routes analytics đều yêu cầu quyền admin
router.get('/', adminRole, getAnalytics);
router.get('/best-selling', adminRole, getBestSellingProducts);
router.get('/chart-data', adminRole, getChartData);
router.get('/order-status', adminRole, getOrderStatusSummary);
router.get('/low-stock', adminRole, getLowStockProducts);
router.get('/old-stock', adminRole, getOldStockProducts);
router.get('/branch-ranking', adminRole, getBranchRanking);
router.get('/dashboard-overview', adminRole, getDashboardOverview);

export default router;
