import express from "express";
const router = express.Router();

import {
  getAllCategoriesForUser,
  getCategoryBySlug,
  getUsedCategories,
} from "#category/category.controller.js";
import {
  getAllCategoriesForAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
} from "#category/category.admin.controller.js";
import { adminRole } from "#middlewares/auth.middleware.js";

// --- ROUTES CÔNG KHAI ---
router.get("/", getAllCategoriesForUser);
router.get("/used-special", getUsedCategories);
router.get("/slug/:slug", getCategoryBySlug);

// --- ROUTES QUẢN TRỊ ---
router.get("/all", getAllCategoriesForAdmin);
router.post("/", adminRole, createCategory);
router.put("/:id", adminRole, updateCategory);
router.delete("/:id", adminRole, deleteCategory);

export default router;
