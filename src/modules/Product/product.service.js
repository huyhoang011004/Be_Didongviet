import Product from "#product/Product.model.js";
import { calculateDiscountedPrice } from "#utils/discountHelper.js";
import mongoose from "mongoose";
import Category from "#category/Category.model.js";

// Helper: Map dữ liệu từ bảng inventories vào variants của sản phẩm để đồng bộ cấu trúc cũ
export const formatProductWithInventories = (product) => {
  if (!product) return null;
  const productObj = product.toObject ? product.toObject() : product;
  const inventories = productObj.inventories || [];
  if (Array.isArray(productObj.variants)) {
    productObj.variants = productObj.variants.map((variant) => {
      const variantInventories = inventories.filter(
        (inv) => inv.sku === variant.sku,
      );
      return {
        ...variant,
        inventory: variantInventories.map((inv) => ({
          branch: inv.branch?._id || inv.branch,
          stock: inv.stock || 0,
        })),
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
    const prices = productObj.variants
      .map((v) => v.salePrice ?? v.price ?? 0)
      .filter((p) => p > 0);
    basePrice =
      prices.length > 0
        ? Math.min(...prices)
        : productObj.salePrice || productObj.price;
  } else {
    basePrice = productObj.salePrice || productObj.price;
  }

  const finalPrice = userInfo
    ? calculateDiscountedPrice(basePrice, {
        isDMember: userInfo.isDMember,
        tradeInBonus: productObj.tradeInBonus,
      })
    : basePrice;

  return {
    ...productObj,
    finalPrice,
    supportTrial: !!productObj.isUsed, // Dùng !! để ép kiểu boolean
  };
};

// Lấy danh sách sản phẩm kèm bộ lọc và tìm kiếm
export const fetchProducts = async (filters) => {
  const {
    category,
    brand,
    isUsed,
    sort,
    keyword,
    priceMin,
    priceMax,
    ram,
    rom,
    onSale,
  } = filters;
  const query = {};

  if (keyword) query.name = { $regex: keyword, $options: "i" };

  if (category) {
    let categoryDoc;
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryDoc = await Category.findById(category);
    } else {
      categoryDoc = await Category.findOne({ slug: category });
    }

    if (categoryDoc) {
      const descendantCategories = await Category.find({
        $or: [{ _id: categoryDoc._id }, { ancestors: categoryDoc._id }],
      });
      const categoryIds = descendantCategories.map((c) => c._id);
      query.category = { $in: categoryIds };
    } else {
      query.category = category;
    }
  }
  if (brand) query.brand = brand;
  if (isUsed !== undefined) query.isUsed = isUsed === "true";

  // Bộ lọc cho variants
  const variantFilters = {};
  if (priceMin || priceMax) {
    variantFilters.$or = [];
    if (priceMin)
      variantFilters.$or.push(
        { price: { $gte: priceMin } },
        { salePrice: { $gte: priceMin } },
      );
    if (priceMax)
      variantFilters.$or.push(
        { price: { $lte: priceMax } },
        { salePrice: { $lte: priceMax } },
      );
  }
  if (ram) variantFilters.ram = ram;
  if (rom) variantFilters.rom = rom;
  if (onSale === "true")
    variantFilters.$expr = { $lt: ["$salePrice", "$price"] };

  if (Object.keys(variantFilters).length > 0) {
    query.variants = { $elemMatch: variantFilters };
  }

  const sortOptions = {
    price_asc: { "variants.price": 1 },
    price_desc: { "variants.price": -1 },
    newest: { createdAt: -1 },
  };

  console.log("fetchProducts final query:", JSON.stringify(query, null, 2));
  return await Product.find(query)
    .populate("category", "name slug")
    .populate("inventories")
    .sort(sortOptions[sort] || sortOptions.newest);
};

// Lấy sản phẩm liên quan
export const fetchRelatedProducts = async (productId, limit = 10, isUsed = undefined, excludeIds = []) => {
  let product;
  if (mongoose.Types.ObjectId.isValid(productId)) {
    product = await Product.findById(productId);
  } else {
    product = await Product.findOne({ slug: productId });
  }
  if (!product) return [];

  // Tính toán khoảng giá động từ variants nếu không có sẵn trong document DB
  let minPrice = product.priceRange?.min;
  let maxPrice = product.priceRange?.max;
  if (!minPrice || !maxPrice) {
    const prices = (product.variants || [])
      .map((v) => v.salePrice ?? v.price ?? 0)
      .filter((p) => p > 0);
    if (prices.length > 0) {
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    } else {
      minPrice = product.price || 0;
      maxPrice = product.price || 0;
    }
  }

  // 1. Tìm toàn bộ các danh mục thuộc cùng một ngành hàng lớn (cùng tổ tiên cấp cao nhất - danh mục ông/bà)
  let categoryIds = [product.category];
  const currentCategory = await Category.findById(product.category);
  if (currentCategory) {
    const topAncestorId = currentCategory.ancestors && currentCategory.ancestors.length > 0 
      ? currentCategory.ancestors[0] 
      : currentCategory._id;
      
    const relatedCats = await Category.find({
      $or: [
        { _id: topAncestorId },
        { ancestors: topAncestorId }
      ]
    });
    categoryIds = relatedCats.map(c => c._id);
  }

  // Chuyển excludeIds sang ObjectId nếu cần, và thêm sản phẩm hiện tại vào danh sách loại trừ
  const baseExclude = [product._id, ...excludeIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))];

  // 2. Query sản phẩm cùng ngành hàng và có khoảng giá chênh lệch ±20%
  const query = {
    _id: { $nin: baseExclude },
    category: { $in: categoryIds },
  };

  if (isUsed !== undefined && isUsed !== null && isUsed !== '') {
    if (isUsed === "true" || isUsed === true) {
      query.isUsed = true;
    } else {
      query.isUsed = { $ne: true };
    }
  }

  if (minPrice || maxPrice) {
    const priceMinLimit = minPrice * 0.8;
    const priceMaxLimit = maxPrice * 1.2;
    query.$or = [
      { "variants.price": { $gte: priceMinLimit, $lte: priceMaxLimit } },
      { "variants.salePrice": { $gte: priceMinLimit, $lte: priceMaxLimit } }
    ];
  }

  let related = await Product.find(query).populate("inventories");

  // 3. Nếu chưa đủ số lượng sản phẩm yêu cầu, truy vấn bù đắp thêm các sản phẩm cùng ngành hàng không lọc giá
  if (related.length < limit) {
    const currentExclude = [...baseExclude, ...related.map(r => r._id)];
    const fallbackQuery = {
      _id: { $nin: currentExclude },
      category: { $in: categoryIds },
    };
    if (isUsed !== undefined && isUsed !== null && isUsed !== '') {
      if (isUsed === "true" || isUsed === true) {
        fallbackQuery.isUsed = true;
      } else {
        fallbackQuery.isUsed = { $ne: true };
      }
    }
    const extraRelated = await Product.find(fallbackQuery).populate("inventories");
    related = [...related, ...extraRelated];
  }

  // 4. Nếu vẫn chưa đủ số lượng yêu cầu (do danh mục ít sản phẩm), tìm các sản phẩm ở danh mục khác có khoảng giá chênh lệch ±20%
  if (related.length < limit && (minPrice || maxPrice)) {
    const currentExclude = [...baseExclude, ...related.map(r => r._id)];
    const priceMinLimit = minPrice * 0.8;
    const priceMaxLimit = maxPrice * 1.2;
    const priceFallbackQuery = {
      _id: { $nin: currentExclude },
      $or: [
        { "variants.price": { $gte: priceMinLimit, $lte: priceMaxLimit } },
        { "variants.salePrice": { $gte: priceMinLimit, $lte: priceMaxLimit } }
      ]
    };
    if (isUsed !== undefined && isUsed !== null && isUsed !== '') {
      if (isUsed === "true" || isUsed === true) {
        priceFallbackQuery.isUsed = true;
      } else {
        priceFallbackQuery.isUsed = { $ne: true };
      }
    }
    const extraPriceRelated = await Product.find(priceFallbackQuery).populate("inventories");
    related = [...related, ...extraPriceRelated];
  }

  // 5. Nếu vẫn chưa đủ 10 sản phẩm, tìm bất kỳ sản phẩm nào khác để bù đắp
  if (related.length < limit) {
    const currentExclude = [...baseExclude, ...related.map(r => r._id)];
    const absoluteFallbackQuery = {
      _id: { $nin: currentExclude }
    };
    if (isUsed !== undefined && isUsed !== null && isUsed !== '') {
      if (isUsed === "true" || isUsed === true) {
        absoluteFallbackQuery.isUsed = true;
      } else {
        absoluteFallbackQuery.isUsed = { $ne: true };
      }
    }
    const finalExtra = await Product.find(absoluteFallbackQuery).populate("inventories");
    related = [...related, ...finalExtra];
  }

  // Thuật toán xáo trộn Fisher-Yates để trả về ngẫu nhiên thứ tự sản phẩm
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const shuffledRelated = shuffleArray(related).slice(0, limit);
  return shuffledRelated.map((p) => formatProductResponse(p));
};
