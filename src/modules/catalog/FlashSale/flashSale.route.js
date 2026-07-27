import express from 'express';
const router = express.Router();

import { getCurrentFlashSale } from '#flashSale/flashSale.controller.js';
import {
  getAllFlashSales,
  getFlashSaleById,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  toggleFlashSaleStatus
} from '#flashSale/flashSale.admin.controller.js';

import { adminRole } from '#middlewares/auth.middleware.js';

// Route công khai cho khách hàng
router.get('/current', getCurrentFlashSale);

// Route quản trị hệ thống
router.get('/admin/all', adminRole, getAllFlashSales);
router.post('/admin', adminRole, createFlashSale);
router.get('/admin/:id', adminRole, getFlashSaleById);
router.put('/admin/:id', adminRole, updateFlashSale);
router.delete('/admin/:id', adminRole, deleteFlashSale);
router.patch('/admin/:id/status', adminRole, toggleFlashSaleStatus);

export default router;
