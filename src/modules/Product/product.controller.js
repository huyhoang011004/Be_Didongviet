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

      const totalProducts = await Product.countDocuments(query);
      const products = await Product.find(query)
         .populate('category', 'name slug')
         .populate('inventories')
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limit);

      const formattedProducts = products.map(p => formatProductResponse(p, req.user));

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
      const product = await Product.findById(id).populate('category', 'name slug').populate('inventories');
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
      const products = await productService.fetchRelatedProducts(req.params.id);
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
      const { q } = req.query;
      if (!q || !q.trim()) return res.status(200).json({ success: true, data: [] });

      const products = await Product.aggregate([
         // 1. Tìm kiếm thông minh bằng Atlas Search trên các trường mong muốn
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
         // 2. Giới hạn 10 kết quả tốt nhất để làm preview gọn nhẹ
         { $limit: 10 },
         // 3. Sử dụng $project để định hình và format dữ liệu trả về giống cấu trúc FE cần
         {
            $project: {
               _id: 1,
               name: 1,
               slug: 1,
               // Lấy ảnh có isThumbnail: true hoặc lấy phần tử đầu tiên trong mảng images
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
               // Tìm giá thấp nhất từ mảng variants để làm giá hiển thị đại diện (priceRange.min)
               price: {
                  $min: {
                     $map: {
                        input: "$variants",
                        as: "v",
                        in: { $ifNull: ["$$v.salePrice", "$$v.price"] }
                     }
                  }
               },
               // Tìm giá gốc lớn nhất để làm giá cũ (gạch chân) nếu có salePrice
               oldPrice: {
                  $max: {
                     $map: {
                        input: "$variants",
                        as: "v",
                        in: {
                           $cond: {
                              if: { $and: [{ $not: ["$$v.salePrice"] }, { $gt: ["$$v.price", 0] }] },
                              then: null, // Không giảm giá thì không có oldPrice đại diện
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