import Category from '#category/Category.model.js';

//Helper: Chuyển đổi danh sách phẳng thành cấu trúc cây (Tree)
const createCategoryTree = (categories, parentId = null) => {
    const categoryList = [];
    let filteredCats;

    if (parentId == null) {
        filteredCats = categories.filter(cat => cat.parentCategory == null);
    } else {
        filteredCats = categories.filter(cat =>
            cat.parentCategory && String(cat.parentCategory._id || cat.parentCategory) === String(parentId)
        );
    }

    for (let cat of filteredCats) {
        categoryList.push({
            _id: cat._id,
            name: cat.name,
            slug: cat.slug,
            image: cat.image,
            brands: cat.brands,
            displayOrder: cat.displayOrder,
            children: createCategoryTree(categories, cat._id)
        });
    }
    return categoryList;
};

// 1. LẤY TẤT CẢ DANH MỤC (DẠNG CÂY)
export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ displayOrder: 1 });
        const result = createCategoryTree(categories);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. LẤY CHI TIẾT THEO SLUG
export const getCategoryBySlug = async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug }).populate('parentCategory');
        if (!category) {
            return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
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
        const parent = await Category.findOne({ slug: 'may-cu-gia-re' });
        if (!parent) return res.status(404).json({ success: false, message: 'Chưa có danh mục máy cũ' });

        const children = await Category.find({ parentCategory: parent._id }).sort({ displayOrder: 1 });
        res.status(200).json({ success: true, data: children });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};