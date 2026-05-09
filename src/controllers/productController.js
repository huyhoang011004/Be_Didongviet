import Product from '../models/Product.js';
import * as productService from '../services/productService.js';

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
        // Truyền req.user (nếu có) vào service để tính giá cá nhân hóa
        const product = await productService.fetchProductById(req.params.id, req.user);
        if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getHSSVProducts = async (req, res) => {
    try {
        const data = await productService.fetchCampaignProducts('HSSV');
        res.json({ success: true, data });
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
        const products = await Product.find({ stock: { $lt: 5 } });
        res.status(200).json({ success: true, count: products.length, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createProduct = async (req, res) => {
    try {
        if (req.file) req.body.images = [`/uploads/${req.file.filename}`];
        const newProduct = await Product.create(req.body);
        res.status(201).json({ success: true, data: newProduct });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateProduct = async (req, res) => {
    try {
        if (req.file) req.body.images = [`/uploads/${req.file.filename}`];
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedProduct) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

        res.json({ success: true, data: updatedProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        res.json({ success: true, message: 'Đã xóa sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};