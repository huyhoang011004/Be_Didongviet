import Category from '#category/Category.model.js';

// TẠO MỚI 
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

// CẬP NHẬT 
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

// XÓA 
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

