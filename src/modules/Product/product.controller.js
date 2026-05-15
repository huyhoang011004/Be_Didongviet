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

export const getProductById = async (req, res) => {
    try {
        const { identifier } = req.params;
        let product;
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            product = await productService.fetchProductById(identifier, req.user);
        } else {
            const prod = await Product.findOne({ slug: identifier });
            product = prod ? formatProductResponse(prod, req.user) : null;
        }
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Lấy sản phẩm Thu cũ đổi mới (Trade-in)
export const getTradeInProducts = async (req, res) => {
    try {
        // Gọi service với tham số 'TradeIn'
        const data = await productService.fetchCampaignProducts('TradeIn');
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

export const createProduct = async (req, res) => {
    // Lưu lại đường dẫn file để xóa nếu DB lỗi
    const filePath = req.file ? req.file.path : null;

    try {
        let data = req.body;

        // Parse variants
        if (typeof data.variants === 'string') {
            data.variants = JSON.parse(data.variants);
        }

        // Gán link ảnh vào data để lưu vào DB
        if (req.file) {
            // Lưu đường dẫn dạng public để frontend gọi được
            data.image = `/uploads/products/${req.file.filename}`;
        }

        // 1. Thực hiện lưu vào Database
        const newProduct = await Product.create(data);

        // 2. Thành công -> Trả về kết quả
        res.status(201).json({
            success: true,
            message: "Tạo sản phẩm và lưu ảnh thành công",
            data: newProduct
        });

    } catch (error) {
        // 3. THẤT BẠI -> Xóa ảnh vừa upload để dọn rác ổ cứng
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Đã xóa ảnh tạm do lỗi tạo DB");
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Mã SKU hoặc tên sản phẩm đã tồn tại!"
            });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { identifier } = req.params;
        let updateData = req.body;

        // 1. Xử lý ảnh mới nếu có upload
        if (req.file) {
            updateData.image = `/uploads/products/${req.file.filename}`;

            // (Tùy chọn) Tìm sản phẩm cũ để xóa ảnh cũ trên ổ cứng tránh rác server
            const oldProduct = await Product.findOne(
                identifier.match(/^[0-9a-fA-F]{24}$/) ? { _id: identifier } : { slug: identifier }
            );
            if (oldProduct?.image) {
                const oldPath = `./${oldProduct.image}`;
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        // 2. Parse variants nếu gửi qua form-data
        if (typeof updateData.variants === 'string') {
            updateData.variants = JSON.parse(updateData.variants);
        }

        // 3. Tìm và cập nhật (Hỗ trợ cả ID và Slug)
        const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
        const query = isObjectId ? { _id: identifier } : { slug: identifier };

        if (updateData.name) {
            updateData.slug = slugify(updateData.name);
        }

        const updatedProduct = await Product.findOneAndUpdate(
            query,
            { $set: updateData }, // Sử dụng $set để chỉ cập nhật các trường gửi lên
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để cập nhật' });
        }

        res.json({ success: true, data: updatedProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { identifier } = req.params; // Lấy đúng tên biến từ Route

        // 1. Xác định query là ID hay Slug
        const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
        const query = isObjectId ? { _id: identifier } : { slug: identifier };

        // 2. Tìm sản phẩm để lấy thông tin ảnh trước khi xóa
        const product = await Product.findOne(query);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        // 3. Xóa ảnh chính của sản phẩm trong thư mục uploads
        if (product.image) {
            const imagePath = `./${product.image.startsWith('/') ? product.image.substring(1) : product.image}`;
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`Đã xóa ảnh: ${imagePath}`);
            }
        }

        // 4. Xóa các ảnh trong variants (nếu bạn có lưu variantImage)
        if (product.variants && product.variants.length > 0) {
            product.variants.forEach(variant => {
                if (variant.variantImage) {
                    const vPath = `./${variant.variantImage.startsWith('/') ? variant.variantImage.substring(1) : variant.variantImage}`;
                    if (fs.existsSync(vPath)) fs.unlinkSync(vPath);
                }
            });
        }

        // 5. Thực hiện xóa khỏi Database
        await Product.deleteOne(query);

        res.json({ success: true, message: 'Đã xóa sản phẩm và các tệp liên quan thành công' });
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