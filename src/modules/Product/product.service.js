import Product from '#product/Product.model.js';
import { calculateDiscountedPrice } from '#utils/discountHelper.js';

// Helper: Chuẩn hóa dữ liệu hiển thị sản phẩm
const formatProductResponse = (product, userInfo = null) => {
    if (!product) return null;

    const productObj = product.toObject ? product.toObject() : product;
    const basePrice = productObj.salePrice || productObj.price;

    const finalPrice = userInfo ? calculateDiscountedPrice(basePrice, {
        isHSSV: userInfo.isHSSV,
        discountHSSV: productObj.discountHSSV,
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
    const { category, brand, isUsed, sort, keyword } = filters;
    const query = {};

    if (keyword) query.name = { $regex: keyword, $options: 'i' };
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (isUsed !== undefined) query.isUsed = isUsed === 'true';

    const sortOptions = {
        price_asc: { salePrice: 1 },
        price_desc: { salePrice: -1 },
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
export const fetchCampaignProducts = async (campaignType) => {
    const query = campaignType === 'HSSV'
        ? { discountHSSV: { $gt: 0 } }
        : { tradeInBonus: { $gt: 0 } };

    const products = await Product.find(query).sort(campaignType === 'HSSV' ? { discountHSSV: -1 } : { tradeInBonus: -1 });
    return products.map(p => formatProductResponse(p));
};