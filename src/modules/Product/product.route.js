import express from 'express';
const router = express.Router();

import {
    getAllProducts,
    getProductsByCategory,
    getProductById,
    getHSSVProducts,
    getTradeInProducts,
    createProduct,
    updateProduct,
    deleteProduct
} from './product.controller.js';

import { protect, adminRole } from '../../middlewares/auth.middleware.js';
import upload from '../../middlewares/upload.middleware.js';

const adminUpload = [protect, adminRole, upload.single('image')];

/**
 * @route   GET & POST /api/v1/products
 */
router.route('/')
    .get(getAllProducts)
    .post(adminUpload, createProduct); // Dùng nhóm middleware đã tối ưu

/**
 * @route   GET /api/v1/products/category/:categorySlug
 */
router.get('/category/:categorySlug', getProductsByCategory);
router.get('/hssv-deals', getHSSVProducts);
router.get('/trade-in', getTradeInProducts);

/**
 * @route   GET, PUT, DELETE /api/v1/products/:id
 */
router.route('/:id')
    .get(getProductById) // Controller này giờ đã tự động tính personalPrice nếu có token
    .put(adminUpload, updateProduct)
    .delete(adminRole, deleteProduct);

export default router;