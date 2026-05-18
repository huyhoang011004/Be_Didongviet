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

