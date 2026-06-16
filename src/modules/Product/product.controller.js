import fs from 'fs';
import path from 'path';
import Product from '#product/Product.model.js';
import Category from '#category/Category.model.js';
import mongoose from 'mongoose';
import * as productService from '#product/product.service.js';
import { formatProductResponse, formatProductWithInventories } from './product.service.js';
import slugify from '#utils/slugify.js';

export const getAllProducts = async (req, res) => {
   try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 8;
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      const branchId = req.query.branchId || '';

      // Xây dựng query cơ bản
      const query = {};
      if (search) {
         query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } },
            { 'variants.sku': { $regex: search, $options: 'i' } },
         ];
      }

      const totalProducts = await Product.countDocuments(query);
      const products = await Product.find(query)
         .populate('category', 'name slug')
         .populate('inventories')
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limit)
         .lean(); // Dùng lean() để lấy plain object, giữ nguyên tất cả fields trong DB kể cả inventory

      // Format sản phẩm và tính totalStock từ variant.inventory inline
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const formattedProducts = products.map(p => {
         const productWithInv = formatProductWithInventories(p);
         const variants = productWithInv.variants || [];

         // Tính totalStock từ variant.inventory
         let totalStock;
         if (branchId) {
            // Lọc theo chi nhánh cụ thể
            totalStock = variants.reduce((total, variant) => {
               const branchInv = (variant.inventory || []).find(inv => {
                  const branchRef = inv.branch?._id || inv.branch;
                  return branchRef && branchRef.toString() === branchId.toString();
               });
               return total + (branchInv ? (branchInv.stock || 0) : 0);
            }, 0);
         } else {
            // Tổng tất cả chi nhánh
            totalStock = variants.reduce((total, variant) => {
               return total + (variant.inventory || []).reduce((sum, inv) => sum + (inv.stock || 0), 0);
            }, 0);
         }

         // Tính priceRange từ variants
         const prices = variants.map(v => v.salePrice || v.price || 0).filter(p => p > 0);
         const priceRange = prices.length > 0
            ? { min: Math.min(...prices), max: Math.max(...prices) }
            : null;

         // Lấy imageUrl (ưu tiên isThumbnail, rồi ảnh đầu tiên)
         let imageUrl = null;
         if (p.images && p.images.length > 0) {
            const thumbImg = p.images.find(img => img.isThumbnail);
            const firstImg = thumbImg || p.images[0];
            const rawUrl = typeof firstImg === 'string' ? firstImg : firstImg?.url;
            if (rawUrl) {
               imageUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`;
            }
         }

         return {
            ...productWithInv,
            totalStock,
            priceRange,
            imageUrl,
         };
      });

      res.status(200).json({
         success: true,
         currentPage: page,
         totalPages: Math.ceil(totalProducts / limit) || 1,
         totalProducts,
         products: formattedProducts,
      });
   } catch (error) {
      res.status(500).json({ success: false, message: error.message });
   }
};

// Lấy sản phẩm theo id danh mục (bao gồm cả danh mục con)
export const getProductsByCategoryID = async (req, res) => {
   try {
      const { categoryID } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 8;
      const skip = (page - 1) * limit;
      const brand = req.query.brand;
      const sort = req.query.sort;

      // 1. Tìm danh mục dựa trên ID hoặc slug
      let category;
      if (mongoose.Types.ObjectId.isValid(categoryID)) {
         category = await Category.findById(categoryID);
      } else {
         category = await Category.findOne({ slug: categoryID });
      }

      if (!category) {
         return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
      }

      // 2. Tìm tất cả danh mục con/cháu của nó dựa trên trường ancestors
      const descendantCategories = await Category.find({
         $or: [
            { _id: category._id },
            { ancestors: category._id }
         ]
      });
      const categoryIds = descendantCategories.map(c => c._id);

      // 3. Lấy sản phẩm thuộc danh mục hiện tại hoặc các danh mục con
      const query = { category: { $in: categoryIds } };

      // Hỗ trợ lọc theo thương hiệu (brand)
      if (brand && brand !== 'all') {
         query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
      }

      // Hỗ trợ sắp xếp (sort)
      let sortQuery = { createdAt: -1 };
      if (sort === 'price_asc') {
         sortQuery = { "variants.salePrice": 1, "variants.price": 1 };
      } else if (sort === 'price_desc') {
         sortQuery = { "variants.salePrice": -1, "variants.price": -1 };
      }

      const totalProducts = await Product.countDocuments(query);
      const products = await Product.find(query)
         .populate('category', 'name slug')
         .populate('inventories')
         .sort(sortQuery)
         .skip(skip)
         .limit(limit);

      // Format sản phẩm và tính totalStock từ variant.inventory
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const formattedProducts = products.map(p => {
         const productWithInv = formatProductWithInventories(p);
         const variants = productWithInv.variants || [];

         // Tính totalStock: tổng tất cả chi nhánh
         const totalStock = variants.reduce((total, variant) => {
            return total + (variant.inventory || []).reduce((sum, inv) => sum + (inv.stock || 0), 0);
         }, 0);

         // Tính priceRange từ variants
         const prices = variants.map(v => v.salePrice || v.price || 0).filter(p => p > 0);
         const priceRange = prices.length > 0
            ? { min: Math.min(...prices), max: Math.max(...prices) }
            : null;

         // Lấy imageUrl (ưu tiên isThumbnail, rồi ảnh đầu tiên)
         let imageUrl = null;
         if (p.images && p.images.length > 0) {
            const thumbImg = p.images.find(img => img.isThumbnail);
            const firstImg = thumbImg || p.images[0];
            const rawUrl = typeof firstImg === 'string' ? firstImg : firstImg?.url;
            if (rawUrl) {
               imageUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`;
            }
         }

         return {
            ...productWithInv,
            totalStock,
            priceRange,
            imageUrl,
         };
      });

      res.json({
         success: true,
         currentPage: page,
         totalPages: Math.ceil(totalProducts / limit) || 1,
         totalProducts,
         products: formattedProducts
      });
   } catch (error) {
      res.status(500).json({ success: false, message: error.message });
   }
};

export const getProductById = async (req, res) => {
   try {
      const { id } = req.params;
      let product;
      if (mongoose.Types.ObjectId.isValid(id)) {
         product = await Product.findById(id).populate('category', 'name slug').populate('inventories');
      } else {
         product = await Product.findOne({ slug: id }).populate('category', 'name slug').populate('inventories');
      }
      if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

      const formattedProduct = formatProductResponse(product, req.user);
      res.status(200).json({ success: true, data: formattedProduct });
   } catch (error) {
      res.status(500).json({ success: false, message: error.message });
   }
};

// Lấy sản phẩm theo SKU
export const getProductBySKU = async (req, res) => {
   try {
      const { sku } = req.params;
      const product = await Product.findOne({ "variants.sku": sku }).populate('category', 'name slug').populate('inventories');
      if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      res.json({ success: true, data: formatProductWithInventories(product) });
   } catch (error) {
      res.status(500).json({ success: false, message: error.message });
   }
};

// Lấy sản phẩm liên quan
export const getRelatedProducts = async (req, res) => {
   try {
      const { limit, isUsed, exclude } = req.query;
      const excludeIds = exclude ? exclude.split(',') : [];
      const products = await productService.fetchRelatedProducts(
         req.params.id,
         limit ? parseInt(limit) : 10,
         isUsed,
         excludeIds
      );
      res.json({ success: true, data: products });
   } catch (error) {
      res.status(500).json({ success: false, message: error.message });
   }
};

// Lấy sản phẩm Thu cũ đổi mới (Trade-in)
export const getTradeInProducts = async (req, res) => {
   try {
      const data = await productService.fetchTradeInProducts();
      res.json({ success: true, data });
   } catch (error) {
      res.status(500).json({ success: false, message: error.message });
   }
};
// Lấy sản phẩm theo chiến dịch đặc biệt
export const fetchTradeInProducts = async () => {
   // 1. Chỉ tìm các sản phẩm có bonus thu cũ đổi mới > 0
   const query = { tradeInBonus: { $gt: 0 } };

   // 2. Sắp xếp theo mức thưởng cao nhất lên trước
   const products = await Product.find(query)
      .sort({ tradeInBonus: -1 })
      .populate('category', 'name slug')
      .populate('inventories'); // Populate thêm category để frontend hiển thị nhãn hiệu

   // 3. Format lại dữ liệu trả về (bao gồm link ảnh đầy đủ)
   return products.map(p => formatProductResponse(p));
};

export const searchProducts = async (req, res, next) => {
   try {
      const { q, limit } = req.query;
      const limitVal = parseInt(limit, 10) || 10;
      if (!q || !q.trim()) return res.status(200).json({ success: true, data: [] });

      let products = [];
      try {
         // Thử dùng Atlas Search trước
         products = await Product.aggregate([
            {
               $search: {
                  index: "default",
                  text: {
                     query: q.trim(),
                     path: ["name", "slug", "brand"],
                     fuzzy: {
                        maxEdits: 2,
                        prefixLength: 1,
                        maxExpansions: 50
                     }
                  }
               }
            },
            { $limit: limitVal },
            {
               $project: {
                  _id: 1,
                  name: 1,
                  slug: 1,
                  thumbnail: {
                     $let: {
                        vars: {
                           thumbImg: {
                              $filter: {
                                 input: "$images",
                                 as: "img",
                                 cond: { $eq: ["$$img.isThumbnail", true] }
                              }
                           }
                        },
                        in: {
                           $cond: {
                              if: { $gt: [{ $size: "$$thumbImg" }, 0] },
                              then: { $arrayElemAt: ["$$thumbImg.url", 0] },
                              else: { $arrayElemAt: ["$images.url", 0] }
                           }
                        }
                     }
                  },
                  price: {
                     $min: {
                        $map: {
                           input: "$variants",
                           as: "v",
                           in: { $ifNull: ["$$v.salePrice", "$$v.price"] }
                        }
                     }
                  },
                  oldPrice: {
                     $max: {
                        $map: {
                           input: "$variants",
                           as: "v",
                           in: {
                              $cond: {
                                 if: { $and: [{ $not: ["$$v.salePrice"] }, { $gt: ["$$v.price", 0] }] },
                                 then: null,
                                 else: "$$v.price"
                              }
                           }
                        }
                     }
                  },
                  category: 1,
                  variants: 1,
                  brand: 1
               }
            }
         ]);
      } catch (searchError) {
         console.warn("Atlas Search failed or not supported, falling back to regex search:", searchError.message);
         // Fallback dùng Regex thông minh
         const qTrimmed = q.trim();
         const searchRegex = new RegExp(qTrimmed, 'i');
         const exactRegex = new RegExp(`^${qTrimmed}$`, 'i');
         const prefixRegex = new RegExp(`^${qTrimmed}`, 'i');

         products = await Product.aggregate([
            {
               $match: {
                  isActive: true,
                  $or: [
                     { name: searchRegex },
                     { brand: searchRegex },
                     { slug: searchRegex }
                  ]
               }
            },
            {
               $addFields: {
                  score: {
                     $cond: {
                        if: { $regexMatch: { input: "$name", regex: exactRegex } },
                        then: 10,
                        else: {
                           $cond: {
                              if: { $regexMatch: { input: "$name", regex: prefixRegex } },
                              then: 5,
                              else: {
                                 $cond: {
                                    if: { $regexMatch: { input: "$brand", regex: exactRegex } },
                                    then: 3,
                                    else: 1
                                 }
                              }
                           }
                        }
                     }
                  }
               }
            },
            { $sort: { score: -1, createdAt: -1 } },
            { $limit: limitVal },
            {
               $project: {
                  _id: 1,
                  name: 1,
                  slug: 1,
                  thumbnail: {
                     $let: {
                        vars: {
                           thumbImg: {
                              $filter: {
                                 input: "$images",
                                 as: "img",
                                 cond: { $eq: ["$$img.isThumbnail", true] }
                              }
                           }
                        },
                        in: {
                           $cond: {
                              if: { $gt: [{ $size: "$$thumbImg" }, 0] },
                              then: { $arrayElemAt: ["$$thumbImg.url", 0] },
                              else: { $arrayElemAt: ["$images.url", 0] }
                           }
                        }
                     }
                  },
                  price: {
                     $min: {
                        $map: {
                           input: "$variants",
                           as: "v",
                           in: { $ifNull: ["$$v.salePrice", "$$v.price"] }
                        }
                     }
                  },
                  oldPrice: {
                     $max: {
                        $map: {
                           input: "$variants",
                           as: "v",
                           in: {
                              $cond: {
                                 if: { $and: [{ $not: ["$$v.salePrice"] }, { $gt: ["$$v.price", 0] }] },
                                 then: null,
                                 else: "$$v.price"
                              }
                           }
                        }
                     }
                  },
                  category: 1,
                  variants: 1,
                  brand: 1
               }
            }
         ]);
      }

      // Populate thông tin danh mục cho kết quả aggregate
      const populatedProducts = await Product.populate(products, { path: 'category', select: 'name slug' });

      // Đảm bảo domain/host ảnh chính xác bằng cách duyệt qua kết quả và format nếu cần
      const formattedProducts = populatedProducts.map(product => {
         let thumbUrl = product.thumbnail || '/placeholder-product.png';
         if (product.thumbnail && !product.thumbnail.startsWith('http')) {
            thumbUrl = `${process.env.BASE_URL || 'http://localhost:5000'}${product.thumbnail}`;
         }
         return {
            ...product,
            thumbnail: thumbUrl,
            type: 'product'
         };
      });

      return res.status(200).json({ success: true, data: formattedProducts });
   } catch (error) {
      next(error);
   }
};