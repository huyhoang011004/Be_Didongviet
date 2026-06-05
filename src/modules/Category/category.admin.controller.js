import Category from "#category/Category.model.js";

// API CHO ADMIN (TRẢ VỀ DẠNG PHẲNG NGUYÊN BẢN - SELECT/MODAL)
export const getAllCategoriesForAdmin = async (req, res) => {
  try {
    // Lấy mảng phẳng, không cần chạy qua hàm đệ quy tạo cây
    const categories = await Category.find().sort({ displayOrder: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// TẠO MỚI
export const createCategory = async (req, res) => {
  try {
    const { name, parentCategory } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Tên danh mục là bắt buộc" });
    }

    let ancestors = [];
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (parent) {
        ancestors = [...(parent.ancestors || []), parent._id];
      }
    }

    const newCategory = await Category.create({ ...req.body, ancestors });
    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// CẬP NHẬT
export const updateCategory = async (req, res) => {
  try {
    const { name, parentCategory } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Tên danh mục là bắt buộc" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục để cập nhật",
      });
    }

    let ancestors = category.ancestors;
    const parentChanged = String(parentCategory || "") !== String(category.parentCategory || "");

    if (parentChanged) {
      if (parentCategory) {
        const parent = await Category.findById(parentCategory);
        if (parent) {
          ancestors = [...(parent.ancestors || []), parent._id];
        } else {
          ancestors = [];
        }
      } else {
        ancestors = [];
      }
    }

    Object.assign(category, req.body, { ancestors });
    await category.save();

    if (parentChanged) {
      await updateChildrenAncestors(category._id, ancestors);
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateChildrenAncestors = async (parentId, parentAncestors) => {
  const children = await Category.find({ parentCategory: parentId });
  for (const child of children) {
    const newAncestors = [...parentAncestors, parentId];
    child.ancestors = newAncestors;
    await child.save();
    await updateChildrenAncestors(child._id, newAncestors);
  }
};

// XÓA
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Danh mục không tồn tại" });
    }

    // Kiểm tra xem có danh mục con không trước khi xóa
    const hasChildren = await Category.findOne({
      parentCategory: req.params.id,
    });
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa danh mục này vì vẫn còn danh mục con.",
      });
    }

    await category.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Đã xóa danh mục thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
