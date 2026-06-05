import Product from '#product/Product.model.js';
import { calculateDiscountedPrice } from '#utils/discountHelper.js';
import mongoose from 'mongoose';
import Category from '#category/Category.model.js';

// Helper: Map dữ liệu từ bảng inventories vào variants của sản phẩm để đồng bộ cấu trúc cũ
export const formatProductWithInventories = (product) => {
    if (!product) return null;
    const productObj = product.toObject ? product.toObject() : product;
    const inventories = productObj.inventories || [];
    if (Array.isArray(productObj.variants)) {
        productObj.variants = productObj.variants.map(variant => {
            const variantInventories = inventories.filter(inv => inv.sku === variant.sku);
            return {
                ...variant,
                inventory: variantInventories.map(inv => ({
                    branch: inv.branch?._id || inv.branch,
                    stock: inv.stock || 0
                }))
            };
        });
    }
    return productObj;
};

// Helper: Chuẩn hóa dữ liệu hiển thị sản phẩm
export const formatProductResponse = (product, userInfo = null) => {
    if (!product) return null;

    const productWithInv = formatProductWithInventories(product);
    const productObj = productWithInv;
    
    // Nếu sản phẩm có variants, lấy giá thấp nhất trong variants (ưu tiên salePrice nếu có)
    let basePrice;
    if (Array.isArray(productObj.variants) && productObj.variants.length > 0) {
        const prices = productObj.variants.map(v => (v.salePrice ?? v.price ?? 0)).filter(p => p > 0);
        basePrice = prices.length > 0 ? Math.min(...prices) : (productObj.salePrice || productObj.price);
    } else {
        basePrice = productObj.salePrice || productObj.price;
    }

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
    
    if (category) {
        let categoryDoc;
        if (mongoose.Types.ObjectId.isValid(category)) {
            categoryDoc = await Category.findById(category);
        } else {
            categoryDoc = await Category.findOne({ slug: category });
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
            query.category = category;
        }
    }
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

    console.log('fetchProducts final query:', JSON.stringify(query, null, 2));
    return await Product.find(query).populate('category', 'name slug').populate('inventories').sort(sortOptions[sort] || sortOptions.newest);
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
    return await Product.find(query).populate('inventories').limit(limit);
};

