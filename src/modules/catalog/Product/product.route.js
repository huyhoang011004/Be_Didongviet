import express from "express";
const router = express.Router();

import {
  getAllProducts,
  getTradeInProducts,
  getRelatedProducts,
  getProductBySKU,
  searchProducts,
  getProductsByCategoryID,
  getProductById,
} from "#product/product.controller.js";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  isActiveProduct
} from "#product/product.admin.controller.js";

import { adminRole } from "#middlewares/auth.middleware.js";
import upload from "#middlewares/upload.middleware.js";
import mongoose from "mongoose";

const preGenerateProductId = (req, res, next) => {
  if (req.method === "POST") {
    req.productId = new mongoose.Types.ObjectId().toString();
  }
  next();
}; // Hàm tạo ID ngẫu nhiên cho sản phẩm trước khi tạo

// ==========================================
// 1. PUBLIC ROUTES (Static paths BEFORE dynamic :id params)
// ==========================================

router.get("/search", searchProducts);
router.get("/trade-in", getTradeInProducts);
router.get("/sku/:sku", getProductBySKU);
router.get("/category/:categoryID", getProductsByCategoryID);
router.get("/:id/related", getRelatedProducts);
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// ==========================================
// 2. ADMIN ROUTES
// ==========================================

const productUpload = upload.fields([
  { name: "images", maxCount: 6 },
  { name: "variantImages", maxCount: 20 },
]);

router
  .route("/")
  .post(adminRole, preGenerateProductId, productUpload, createProduct);

router
  .route("/:id")
  .put(adminRole, productUpload, updateProduct)
  .patch(adminRole, isActiveProduct)
  .delete(adminRole, deleteProduct);
export default router;