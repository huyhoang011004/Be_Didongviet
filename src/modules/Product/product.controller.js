import fs from 'fs';
import path from 'path';
import Product from '#product/Product.model.js';
import Category from '#category/Category.model.js';
import mongoose from 'mongoose';
import * as productService from '#product/product.service.js';
import { formatProductResponse } from './product.service.js';
import slugify from '#utils/slugify.js';

export const getAllProducts = async (req, res) => {
    try {
        const products = await productService.fetchProducts(req.query);
        res.status(200).json({ success: true, count: products.length, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
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
                    }
                }
            }
        ]);

        // Đảm bảo domain/host ảnh chính xác bằng cách duyệt qua kết quả và format nếu cần
        const formattedProducts = products.map(product => {
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
// Lấy sản phẩm theo danh mục (bao gồm cả danh mục con)
export const getProductsByCategory = async (req, res) => {
    try {
        const { categorySlug } = req.params;

        // 1. Tìm ID của danh mục dựa trên slug
        const category = await Category.findOne({ slug: categorySlug });
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });

        // 2. Tìm tất cả danh mục con của nó (nếu có)
        const childCategories = await Category.find({ parentCategory: category._id });
        const categoryIds = [category._id, ...childCategories.map(c => c._id)];

        // 3. Lấy sản phẩm thuộc danh mục hiện tại hoặc các danh mục con
        const products = await Product.find({ category: { $in: categoryIds } })
            .populate('category', 'name slug');

        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getProductByIdAndSlug = async (req, res) => {
    try {
        const { id } = req.params;
        let product;
        if (mongoose.Types.ObjectId.isValid(id)) {
            product = await productService.fetchProductById(id, req.user);
        } else {
            const prod = await Product.findOne({ slug: id });
            product = prod ? formatProductResponse(prod, req.user) : null;
        }
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy sản phẩm theo SKU
export const getProductBySKU = async (req, res) => {
    try {
        const product = await productService.getProductBySKU(req.params.sku);
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        res.json({ success: true, data: product });
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

// Lấy sản phẩm sắp hết hàng (Stock < 5) - Cảnh báo cho Admin soạn hàng
export const getLowStockProducts = async (req, res) => {
    try {
        const products = await Product.find({ "variants.stock": { $lt: 5 } });
        res.status(200).json({ success: true, count: products.length, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

