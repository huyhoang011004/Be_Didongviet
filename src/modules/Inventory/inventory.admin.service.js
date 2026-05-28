import Product from '#product/Product.model.js';
import InventoryConfig from './Inventory.model.js';
import StockReceipt from './StockReceipt.model.js';

export const getLowStockProductsService = async (thresholdQuery, pageQuery, limitQuery) => {
    const page = parseInt(pageQuery) || 1;
    const limit = parseInt(limitQuery) || 10;
    const skip = (page - 1) * limit;

    // Lấy threshold từ database, nếu không có thì dùng mặc định 5
    let config = await InventoryConfig.findOne();
    if (!config) {
        config = await InventoryConfig.create({ lowStockThreshold: 5 });
    }
    const threshold = thresholdQuery ? parseInt(thresholdQuery) : config.lowStockThreshold;

    const query = {
        variants: {
            $elemMatch: {
                stock: { $lte: threshold }
            }
        }
    };

    const totalItems = await Product.countDocuments(query);
    const products = await Product.find(query)
        .populate('category', 'name slug')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        products,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        },
        threshold,
        currentConfig: config
    };
};

export const updateLowStockThresholdService = async (newThreshold) => {
    let config = await InventoryConfig.findOne();
    if (!config) {
        config = await InventoryConfig.create({ lowStockThreshold: newThreshold });
    } else {
        config.lowStockThreshold = newThreshold;
        await config.save();
    }
    return config;
};

export const getLowStockThresholdService = async () => {
    let config = await InventoryConfig.findOne();
    if (!config) {
        config = await InventoryConfig.create({ lowStockThreshold: 5 });
    }
    return config;
};

export const updateProductStockService = async (productId, variantIndex, branchId, newStock) => {
    const product = await Product.findById(productId);
    if (!product) {
        const error = new Error('Không tìm thấy sản phẩm');
        error.statusCode = 404;
        throw error;
    }

    const variant = product.variants[variantIndex];
    if (!variant) {
        const error = new Error('Không tìm thấy phiên bản sản phẩm');
        error.statusCode = 404;
        throw error;
    }

    const inventoryItem = variant.inventory.find(inv => inv.branch.toString() === branchId);
    if (!inventoryItem) {
        const error = new Error('Không tìm thấy tồn kho chi nhánh');
        error.statusCode = 404;
        throw error;
    }

    inventoryItem.stock = newStock;
    await product.save();
    return product;
};

export const createStockReceiptService = async (productId, variantIndex, branchId, quantity, notes, createdBy) => {
    const product = await Product.findById(productId);
    if (!product) {
        const error = new Error('Không tìm thấy sản phẩm');
        error.statusCode = 404;
        throw error;
    }

    const variant = product.variants[variantIndex];
    if (!variant) {
        const error = new Error('Không tìm thấy phiên bản sản phẩm');
        error.statusCode = 404;
        throw error;
    }

    const inventoryItem = variant.inventory.find(inv => inv.branch.toString() === branchId);
    if (!inventoryItem) {
        const error = new Error('Không tìm thấy tồn kho chi nhánh');
        error.statusCode = 404;
        throw error;
    }

    // Tạo phiếu nhập kho
    const receipt = await StockReceipt.create({
        product: productId,
        variantIndex,
        branch: branchId,
        quantity,
        notes,
        createdBy,
        status: 'completed'
    });

    // Cập nhật tồn kho
    inventoryItem.stock += quantity;
    await product.save();

    // Populate thông tin trước khi trả về
    await receipt.populate(['product', 'branch', 'createdBy']);

    return receipt;
};

export const getStockReceiptsService = async (pageQuery, limitQuery, filters = {}) => {
    const page = parseInt(pageQuery) || 1;
    const limit = parseInt(limitQuery) || 10;
    const skip = (page - 1) * limit;

    const query = { ...filters };

    const totalItems = await StockReceipt.countDocuments(query);
    const receipts = await StockReceipt.find(query)
        .populate('product', 'name')
        .populate('branch', 'name')
        .populate('createdBy', 'name email')
        .sort({ receiptDate: -1 })
        .skip(skip)
        .limit(limit);

    return {
        receipts,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        }
    };
};

export const cancelStockReceiptService = async (receiptId) => {
    const receipt = await StockReceipt.findById(receiptId);
    if (!receipt) {
        const error = new Error('Không tìm thấy phiếu nhập kho');
        error.statusCode = 404;
        throw error;
    }

    if (receipt.status === 'cancelled') {
        const error = new Error('Phiếu nhập kho đã bị huỷ');
        error.statusCode = 400;
        throw error;
    }

    // Hoàn lại tồn kho nếu phiếu đã được xử lý
    if (receipt.status === 'completed') {
        const product = await Product.findById(receipt.product);
        const variant = product.variants[receipt.variantIndex];
        const inventoryItem = variant.inventory.find(inv => inv.branch.toString() === receipt.branch.toString());

        if (inventoryItem) {
            inventoryItem.stock -= receipt.quantity;
            await product.save();
        }
    }

    receipt.status = 'cancelled';
    await receipt.save();
    return receipt;
};
