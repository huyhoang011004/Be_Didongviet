import express from "express";
const router = express.Router();

import {
  getAllCategoriesForUser,
  getCategoryById,
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
router.get("/all", getAllCategoriesForAdmin); //admin
router.get("/used-special", getUsedCategories);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategoryById);
// --- ROUTES QUẢN TRỊ ---

router.post("/", adminRole, createCategory);
router.put("/:id", adminRole, updateCategory);
router.delete("/:id", adminRole, deleteCategory);

export default router;
