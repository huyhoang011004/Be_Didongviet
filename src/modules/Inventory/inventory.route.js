import { Router } from 'express';
import * as inventoryController from './inventory.admin.controller.js';
import { protect } from '#middlewares/auth.middleware.js';

const router = Router();

// Lấy danh sách sản phẩm sắp hết hàng
router.get('/low-stock', inventoryController.getLowStockProducts);

// Lấy danh sách sản phẩm hết hàng
router.get('/out-of-stock', inventoryController.getOutOfStockProducts);

// Lấy danh sách sản phẩm theo chi nhánh
router.get('/by-branch', inventoryController.getProductsByBranch);

// Lấy cấu hình ngưỡng cảnh báo hiện tại
router.get('/threshold', inventoryController.getLowStockThreshold);

// Cập nhật cấu hình ngưỡng cảnh báo
router.put('/threshold', protect, inventoryController.updateLowStockThreshold);

// Cập nhật tồn kho sản phẩm
router.put('/update-stock', protect, inventoryController.updateProductStock);

// Lấy danh sách phiếu nhập kho
router.get('/stock-receipts', inventoryController.getStockReceipts);

// Tạo phiếu nhập kho bổ sung
router.post('/stock-receipts', protect, inventoryController.createStockReceipt);

// Huỷ phiếu nhập kho
router.put('/stock-receipts/:receiptId/cancel', protect, inventoryController.cancelStockReceipt);

export default router;
