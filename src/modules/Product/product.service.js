import Product from '#product/Product.model.js';
import { calculateDiscountedPrice } from '#utils/discountHelper.js';

// Helper: Chuẩn hóa dữ liệu hiển thị sản phẩm
export const formatProductResponse = (product, userInfo = null) => {
    if (!product) return null;

    const productObj = product.toObject ? product.toObject() : product;
    const basePrice = productObj.salePrice || productObj.price;

    const finalPrice = userInfo ? calculateDiscountedPrice(basePrice, {
        isDMember: userInfo.isDMember,
        tradeInBonus: productObj.tradeInBonus
    }) : basePrice;

    return {
        ...productObj,
        finalPrice,
        supportTrial: !!productObj.isUsed // Dùng !! để ép kiểu boolean
    };
};

// Lấy danh sách sản phẩm kèm bộ lọc và tìm kiếm
export const fetchProducts = async (filters) => {
    const { category, brand, isUsed, sort, keyword, priceMin, priceMax, ram, rom, onSale } = filters;
    const query = {};

    if (keyword) query.name = { $regex: keyword, $options: 'i' };
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (isUsed !== undefined) query.isUsed = isUsed === 'true';

    // Bộ lọc cho variants
    const variantFilters = {};
    if (priceMin || priceMax) {
        variantFilters.$or = [];
        if (priceMin) variantFilters.$or.push({ price: { $gte: priceMin } }, { salePrice: { $gte: priceMin } });
        if (priceMax) variantFilters.$or.push({ price: { $lte: priceMax } }, { salePrice: { $lte: priceMax } });
    }
    if (ram) variantFilters.ram = ram;
    if (rom) variantFilters.rom = rom;
    if (onSale === 'true') variantFilters.$expr = { $lt: ['$salePrice', '$price'] };

    if (Object.keys(variantFilters).length > 0) {
        query.variants = { $elemMatch: variantFilters };
    }

    const sortOptions = {
        price_asc: { 'variants.price': 1 },
        price_desc: { 'variants.price': -1 },
        newest: { createdAt: -1 }
    };

    return await Product.find(query).sort(sortOptions[sort] || sortOptions.newest);
};

// Lấy chi tiết 1 sản phẩm kèm giá cá nhân hóa
export const fetchProductById = async (productId, userInfo = null) => {
    const product = await Product.findById(productId);
    return formatProductResponse(product, userInfo);
};

// Lấy sản phẩm theo chiến dịch đặc biệt
export const fetchTradeInProducts = async () => {
    // 1. Chỉ tìm các sản phẩm có bonus thu cũ đổi mới > 0
    const query = { tradeInBonus: { $gt: 0 } };

    // 2. Sắp xếp theo mức thưởng cao nhất lên trước
    const products = await Product.find(query)
        .sort({ tradeInBonus: -1 })
        .populate('category', 'name slug'); // Populate thêm category để frontend hiển thị nhãn hiệu

    // 3. Format lại dữ liệu trả về (bao gồm link ảnh đầy đủ)
    return products.map(p => formatProductResponse(p));
};

// Lấy sản phẩm liên quan
export const fetchRelatedProducts = async (productId, limit = 5) => {
    const product = await Product.findById(productId);
    if (!product) return [];

    const query = {
        _id: { $ne: productId },
        category: product.category,
        'variants.price': { $gte: product.priceRange.min * 0.8, $lte: product.priceRange.max * 1.2 } // Lọc sản phẩm có giá trong khoảng ±20% so với sản phẩm gốc

    };
    return await Product.find(query).limit(limit);
};

// Cập nhật stock cho variant theo SKU
export const updateStockForVariant = async (sku, newStock) => {
    return await Product.updateOne(
        { "variants.sku": sku },
        { $set: { "variants.$.stock": newStock } }
    );
};

// Lấy sản phẩm theo SKU
export const getProductBySKU = async (sku) => {
    return await Product.findOne({ "variants.sku": sku });
};