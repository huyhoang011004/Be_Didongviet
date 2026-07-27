import Category from "#category/Category.model.js";

// Hàm Helper tạo cây (Chỉ dùng cho API phía User)
const createCategoryTree = (categories, parentId = null) => {
  const categoryList = [];
  let filteredCats =
    parentId === null
      ? categories.filter((cat) => cat.parentCategory == null)
      : categories.filter(
          (cat) =>
            cat.parentCategory &&
            String(cat.parentCategory._id || cat.parentCategory) ===
              String(parentId),
        );

  for (let cat of filteredCats) {
    categoryList.push({
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      brands: cat.brands,
      displayOrder: cat.displayOrder,
      children: createCategoryTree(categories, cat._id),
    });
  }
  return categoryList;
};

// ==========================================
// 1. API CHO USER (TRẢ VỀ DẠNG CÂY - MEGA MENU)
// ==========================================
export const getAllCategoriesForUser = async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1 });
    const treeData = createCategoryTree(categories);
    res.status(200).json({ success: true, data: treeData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. LẤY CHI TIẾT THEO SLUG
export const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).populate(
      "parentCategory",
    );
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Danh mục không tồn tại" });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. LẤY CHI TIẾT THEO ID
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      "parentCategory",
    );
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Danh mục không tồn tại" });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  LẤY DANH MỤC CON CỦA "MÁY CŨ GIÁ RẺ"
export const getUsedCategories = async (req, res) => {
  try {
    // Tìm danh mục cha dựa trên slug để chính xác hơn tên (name)
    const parent = await Category.findOne({ slug: "may-cu-gia-re" });
    if (!parent)
      return res
        .status(404)
        .json({ success: false, message: "Chưa có danh mục máy cũ" });

    const children = await Category.find({ parentCategory: parent._id }).sort({
      displayOrder: 1,
    });
    res.status(200).json({ success: true, data: children });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
