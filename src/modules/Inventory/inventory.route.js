import { Router } from 'express';
import * as inventoryController from './inventory.admin.controller.js';

const router = Router();

// Lấy danh sách sản phẩm sắp hết hàng
router.get('/low-stock', inventoryController.getLowStockProducts);

// Lấy cấu hình ngưỡng cảnh báo hiện tại
router.get('/threshold', inventoryController.getLowStockThreshold);

// Cập nhật cấu hình ngưỡng cảnh báo
router.put('/threshold', inventoryController.updateLowStockThreshold);

// Cập nhật tồn kho sản phẩm
router.put('/update-stock', inventoryController.updateProductStock);

// Lấy danh sách phiếu nhập kho
router.get('/stock-receipts', inventoryController.getStockReceipts);

// Tạo phiếu nhập kho bổ sung
router.post('/stock-receipts', inventoryController.createStockReceipt);

// Huỷ phiếu nhập kho
router.put('/stock-receipts/:receiptId/cancel', inventoryController.cancelStockReceipt);

export default router;
