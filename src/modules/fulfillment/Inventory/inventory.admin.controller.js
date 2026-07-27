import * as inventoryService from './inventory.admin.service.js';

// Theo dõi sản phẩm sắp hết hàng
export const getLowStockProducts = async (req, res) => {
    try {
        const { threshold, page, limit, category } = req.query;
        const result = await inventoryService.getLowStockProductsService(threshold, page, limit, category);

        return res.status(200).json({
            success: true,
            message: `Lấy danh sách sản phẩm sắp hết hàng (tồn kho <= ${result.threshold}) thành công`,
            pagination: result.pagination,
            data: result.products,
            currentThreshold: result.currentConfig.lowStockThreshold
        });
    } catch (error) {
        console.error('GET LOW STOCK ERROR:', error?.message || error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm hết hàng',
            error: error.message
        });
    }
};

// Theo dõi sản phẩm hết hàng
export const getOutOfStockProducts = async (req, res) => {
    try {
        const { page, limit, category } = req.query;
        const result = await inventoryService.getOutOfStockProductsService(page, limit, category);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách sản phẩm hết hàng thành công',
            pagination: result.pagination,
            data: result.products
        });
    } catch (error) {
        console.error('GET OUT OF STOCK ERROR:', error?.message || error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm hết hàng',
            error: error.message
        });
    }
};

// Cấu hình ngưỡng cảnh báo
export const updateLowStockThreshold = async (req, res) => {
    try {
        const { threshold } = req.body;

        if (threshold === undefined || threshold === null) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp giá trị ngưỡng (threshold)'
            });
        }

        if (threshold < 0) {
            return res.status(400).json({
                success: false,
                message: 'Ngưỡng không được âm'
            });
        }

        const config = await inventoryService.updateLowStockThresholdService(threshold);

        return res.json({
            success: true,
            message: 'Cập nhật ngưỡng cảnh báo thành công',
            data: config
        });
    } catch (error) {
        console.error('UPDATE THRESHOLD ERROR:', error?.message || error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi cập nhật ngưỡng cảnh báo',
            error: error.message
        });
    }
};

// Lấy cấu hình ngưỡng hiện tại
export const getLowStockThreshold = async (req, res) => {
    try {
        const config = await inventoryService.getLowStockThresholdService();

        return res.json({
            success: true,
            message: 'Lấy cấu hình ngưỡng cảnh báo thành công',
            data: config
        });
    } catch (error) {
        console.error('GET THRESHOLD ERROR:', error?.message || error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy cấu hình ngưỡng cảnh báo',
            error: error.message
        });
    }
};

// Cập nhật tồn kho theo chi nhánh
export const updateProductStock = async (req, res) => {
    try {
        const { productId, variantIndex, branchId, newStock } = req.body;

        if (!productId || variantIndex === undefined || !branchId || newStock === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin: productId, variantIndex, branchId, newStock'
            });
        }

        const updatedProduct = await inventoryService.updateProductStockService(
            productId,
            variantIndex,
            branchId,
            newStock
        );

        return res.json({
            success: true,
            message: 'Cập nhật tồn kho thành công',
            data: updatedProduct
        });
    } catch (error) {
        console.error('UPDATE STOCK ERROR:', error?.message || error);
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Đã xảy ra lỗi khi cập nhật tồn kho',
            error: error.message
        });
    }
};

// Tạo phiếu nhập kho bổ sung
export const createStockReceipt = async (req, res) => {
    try {
        const { productId, variantIndex, branchId, quantity, notes } = req.body;
        const createdBy = req.user?._id; // Nếu có auth middleware

        if (!productId || variantIndex === undefined || !branchId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin: productId, variantIndex, branchId, quantity'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải lớn hơn 0'
            });
        }

        const receipt = await inventoryService.createStockReceiptService(
            productId,
            variantIndex,
            branchId,
            quantity,
            notes || '',
            createdBy
        );

        return res.status(201).json({
            success: true,
            message: 'Tạo phiếu nhập kho thành công',
            data: receipt
        });
    } catch (error) {
        console.error('CREATE RECEIPT ERROR:', error?.message || error);
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Đã xảy ra lỗi khi tạo phiếu nhập kho',
            error: error.message
        });
    }
};

// Lấy danh sách phiếu nhập kho
export const getStockReceipts = async (req, res) => {
    try {
        const { page, limit, branch, product } = req.query;
        const filters = {};

        if (branch) filters.branch = branch;
        if (product) filters.product = product;

        const result = await inventoryService.getStockReceiptsService(page, limit, filters);

        return res.json({
            success: true,
            message: 'Lấy danh sách phiếu nhập kho thành công',
            pagination: result.pagination,
            data: result.receipts
        });
    } catch (error) {
        console.error('GET RECEIPTS ERROR:', error?.message || error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách phiếu nhập kho',
            error: error.message
        });
    }
};

// Huỷ phiếu nhập kho
export const cancelStockReceipt = async (req, res) => {
    try {
        const { receiptId } = req.params;

        const receipt = await inventoryService.cancelStockReceiptService(receiptId);

        return res.json({
            success: true,
            message: 'Huỷ phiếu nhập kho thành công',
            data: receipt
        });
    } catch (error) {
        console.error('CANCEL RECEIPT ERROR:', error?.message || error);
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Đã xảy ra lỗi khi huỷ phiếu nhập kho',
            error: error.message
        });
    }
};

// Lấy danh sách sản phẩm theo chi nhánh
export const getProductsByBranch = async (req, res) => {
    try {
        const { branchId, page, limit, category, stockFilter } = req.query;

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp branchId'
            });
        }

        const result = await inventoryService.getProductsByBranchService(
            branchId,
            page,
            limit,
            category,
            stockFilter || 'all'
        );

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách sản phẩm theo chi nhánh thành công',
            pagination: result.pagination,
            data: result.products
        });
    } catch (error) {
        console.error('GET PRODUCTS BY BRANCH ERROR:', error?.message || error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách sản phẩm',
            error: error.message
        });
    }
};
