import Product from '#product/Product.model.js';
import InventoryConfig from './Inventory.model.js';
import StockReceipt from './StockReceipt.model.js';
import Category from '#category/Category.model.js';
import Branch from '#branch/Branch.model.js';
import mongoose from 'mongoose';
import { formatProductWithInventories } from '#product/product.service.js';

// Helper: Xác định trạng thái tổng hợp dựa trên mức tồn kho thấp nhất trong các chi nhánh
const getOverallStatus = (product, branches, threshold, selectedBranchFilter = null) => {
    let hasOutOfStock = false;
    let hasLowStock = false;
    
    const inventories = product.inventories || [];
    const invMap = {};
    inventories.forEach(inv => {
        const branchId = inv.branch?._id || inv.branch;
        if (branchId) {
            invMap[`${inv.sku}_${branchId.toString()}`] = inv.stock || 0;
        }
    });

    const targetBranches = selectedBranchFilter 
        ? branches.filter(b => b._id.toString() === selectedBranchFilter.toString())
        : branches;

    for (const branch of targetBranches) {
        for (const variant of (product.variants || [])) {
            const stock = invMap[`${variant.sku}_${branch._id.toString()}`] || 0;
            if (stock === 0) {
                hasOutOfStock = true;
            } else if (stock <= threshold) {
                hasLowStock = true;
            }
        }
    }
    
    if (hasOutOfStock) return 'out-of-stock';
    if (hasLowStock) return 'low-stock';
    return 'in-stock';
};

export const getLowStockProductsService = async (thresholdQuery, pageQuery, limitQuery, categoryQuery) => {
    const page = parseInt(pageQuery) || 1;
    const limit = parseInt(limitQuery) || 10;
    const skip = (page - 1) * limit;

    // Lấy tất cả chi nhánh để xác định trạng thái
    const branches = await Branch.find();

    // Lấy threshold từ database (tìm cấu hình toàn cục hoặc cấu hình bất kỳ)
    let config = await InventoryConfig.findOne({ sku: 'GLOBAL_CONFIG_DUMMY' });
    if (!config) {
        config = await InventoryConfig.findOne();
    }
    if (!config) {
        config = { lowStockThreshold: 5 };
    }
    const threshold = thresholdQuery ? parseInt(thresholdQuery) : config.lowStockThreshold;

    // Lọc theo danh mục nếu có
    const query = {};
    if (categoryQuery) {
        let categoryDoc;
        if (mongoose.Types.ObjectId.isValid(categoryQuery)) {
            categoryDoc = await Category.findById(categoryQuery);
        } else {
            categoryDoc = await Category.findOne({ slug: categoryQuery });
        }

        if (categoryDoc) {
            const descendantCategories = await Category.find({
                $or: [
                    { _id: categoryDoc._id },
                    { ancestors: categoryDoc._id }
                ]
            });
            const categoryIds = descendantCategories.map(c => c._id);
            query.category = { $in: categoryIds };
        } else {
            query.category = categoryQuery;
        }
    }

    // Lấy toàn bộ sản phẩm thỏa mãn điều kiện danh mục
    const allProducts = await Product.find(query)
        .populate('category', 'name slug')
        .populate('inventories')
        .sort({ updatedAt: -1 });

    // Lọc sản phẩm có trạng thái tổng hợp là low-stock
    const lowStockProducts = allProducts.filter(p => getOverallStatus(p, branches, threshold) === 'low-stock');

    const totalItems = lowStockProducts.length;
    const paginatedProducts = lowStockProducts.slice(skip, skip + limit);
    const formattedProducts = paginatedProducts.map(p => formatProductWithInventories(p));

    return {
        products: formattedProducts,
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

export const getOutOfStockProductsService = async (pageQuery, limitQuery, categoryQuery) => {
    const page = parseInt(pageQuery) || 1;
    const limit = parseInt(limitQuery) || 10;
    const skip = (page - 1) * limit;

    // Lấy tất cả chi nhánh để xác định trạng thái
    const branches = await Branch.find();

    // Lấy config threshold
    let config = await InventoryConfig.findOne({ sku: 'GLOBAL_CONFIG_DUMMY' });
    if (!config) {
        config = await InventoryConfig.findOne();
    }
    if (!config) {
        config = { lowStockThreshold: 5 };
    }
    const threshold = config.lowStockThreshold;

    // Lọc theo danh mục nếu có
    const query = {};
    if (categoryQuery) {
        let categoryDoc;
        if (mongoose.Types.ObjectId.isValid(categoryQuery)) {
            categoryDoc = await Category.findById(categoryQuery);
        } else {
            categoryDoc = await Category.findOne({ slug: categoryQuery });
        }

        if (categoryDoc) {
            const descendantCategories = await Category.find({
                $or: [
                    { _id: categoryDoc._id },
                    { ancestors: categoryDoc._id }
                ]
            });
            const categoryIds = descendantCategories.map(c => c._id);
            query.category = { $in: categoryIds };
        } else {
            query.category = categoryQuery;
        }
    }

    // Lấy toàn bộ sản phẩm thỏa mãn điều kiện danh mục
    const allProducts = await Product.find(query)
        .populate('category', 'name slug')
        .populate('inventories')
        .sort({ updatedAt: -1 });

    // Lọc sản phẩm có trạng thái tổng hợp là out-of-stock
    const outOfStockProducts = allProducts.filter(p => getOverallStatus(p, branches, threshold) === 'out-of-stock');

    const totalItems = outOfStockProducts.length;
    const paginatedProducts = outOfStockProducts.slice(skip, skip + limit);
    const formattedProducts = paginatedProducts.map(p => formatProductWithInventories(p));

    return {
        products: formattedProducts,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        }
    };
};

export const updateLowStockThresholdService = async (newThreshold) => {
    let config = await InventoryConfig.findOne({ sku: 'GLOBAL_CONFIG_DUMMY' });
    if (!config) {
        config = new InventoryConfig({
            lowStockThreshold: newThreshold,
            product: new mongoose.Types.ObjectId(),
            branch: new mongoose.Types.ObjectId(),
            sku: 'GLOBAL_CONFIG_DUMMY'
        });
        await config.save();
    } else {
        config.lowStockThreshold = newThreshold;
        await config.save();
    }
    return config;
};

export const getLowStockThresholdService = async () => {
    let config = await InventoryConfig.findOne({ sku: 'GLOBAL_CONFIG_DUMMY' });
    if (!config) {
        config = await InventoryConfig.findOne();
    }
    if (!config) {
        config = { lowStockThreshold: 5 };
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

    // Cập nhật hoặc thêm mới bản ghi trong bảng Inventory
    await InventoryConfig.findOneAndUpdate(
        { product: productId, sku: variant.sku, branch: branchId },
        { $set: { stock: newStock } },
        { upsert: true, new: true }
    );

    // Lấy lại sản phẩm kèm inventories và format để trả về cấu trúc tương thích
    const updatedProduct = await Product.findById(productId).populate('category', 'name slug').populate('inventories');
    return formatProductWithInventories(updatedProduct);
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

    let inventoryItem = await InventoryConfig.findOne({
        product: productId,
        sku: variant.sku,
        branch: branchId
    });

    if (!inventoryItem) {
        inventoryItem = new InventoryConfig({
            product: productId,
            sku: variant.sku,
            branch: branchId,
            stock: 0
        });
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
    await inventoryItem.save();

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
        if (product) {
            const variant = product.variants[receipt.variantIndex];
            if (variant) {
                const inventoryItem = await InventoryConfig.findOne({
                    product: receipt.product,
                    sku: variant.sku,
                    branch: receipt.branch
                });

                if (inventoryItem) {
                    inventoryItem.stock = Math.max(0, inventoryItem.stock - receipt.quantity);
                    await inventoryItem.save();
                }
            }
        }
    }

    receipt.status = 'cancelled';
    await receipt.save();
    return receipt;
};

export const getProductsByBranchService = async (branchId, pageQuery, limitQuery, categoryQuery, stockFilter = 'all') => {
    const page = parseInt(pageQuery) || 1;
    const limit = parseInt(limitQuery) || 10;
    const skip = (page - 1) * limit;

    const branches = await Branch.find();
    let config = await InventoryConfig.findOne({ sku: 'GLOBAL_CONFIG_DUMMY' });
    if (!config) {
        config = await InventoryConfig.findOne();
    }
    if (!config) {
        config = { lowStockThreshold: 5 };
    }
    const threshold = config.lowStockThreshold;

    const query = {};

    // Lọc theo danh mục nếu có
    if (categoryQuery) {
        let categoryDoc;
        if (mongoose.Types.ObjectId.isValid(categoryQuery)) {
            categoryDoc = await Category.findById(categoryQuery);
        } else {
            categoryDoc = await Category.findOne({ slug: categoryQuery });
        }

        if (categoryDoc) {
            const descendantCategories = await Category.find({
                $or: [
                    { _id: categoryDoc._id },
                    { ancestors: categoryDoc._id }
                ]
            });
            const categoryIds = descendantCategories.map(c => c._id);
            query.category = { $in: categoryIds };
        } else {
            query.category = categoryQuery;
        }
    }

    const allProducts = await Product.find(query)
        .populate('category', 'name slug')
        .populate('inventories')
        .sort({ updatedAt: -1 });

    // Lọc sản phẩm dựa trên trạng thái tổng hợp CỦA CHI NHÁNH ĐANG LỌC
    const filteredProducts = allProducts.filter(p => {
        const status = getOverallStatus(p, branches, threshold, branchId);
        if (stockFilter === 'low-stock') {
            return status === 'low-stock';
        } else if (stockFilter === 'out-of-stock') {
            return status === 'out-of-stock';
        }
        return true; // 'all'
    });

    const totalItems = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(skip, skip + limit);
    const formattedProducts = paginatedProducts.map(p => formatProductWithInventories(p));

    return {
        products: formattedProducts,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        }
    };
};
