import Category from '../models/Category.js';

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

// 3. TẠO MỚI (ADMIN)
export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên danh mục là bắt buộc' });
        }
        const newCategory = await Category.create(req.body);
        res.status(201).json({ success: true, data: newCategory });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 4. CẬP NHẬT (ADMIN)
export const updateCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên danh mục là bắt buộc' });
        }
        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục để cập nhật' });
        }

        res.status(200).json({ success: true, data: updatedCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. XÓA (ADMIN)
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
        }

        // Kiểm tra xem có danh mục con không trước khi xóa
        const hasChildren = await Category.findOne({ parentCategory: req.params.id });
        if (hasChildren) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa danh mục này vì vẫn còn danh mục con.'
            });
        }

        await category.deleteOne();
        res.status(200).json({ success: true, message: 'Đã xóa danh mục thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. LẤY DANH MỤC CON CỦA "MÁY CŨ GIÁ RẺ"
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