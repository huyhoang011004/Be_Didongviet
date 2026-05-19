import Blog from '#blog/Blog.model.js';
import slugify from '#utils/slugify.js';

// 1. LẤY DANH SÁCH BÀI VIẾT (Công khai cho User / Hoặc có thể mở rộng cho Admin)
export const getAllBlogs = async (req, res) => {
    try {
        const { category, tag, keyword, page = 1, limit = 10, showAll } = req.query;

        // Mặc định khách hàng vãng lai chỉ xem bài đã xuất bản
        let query = { status: 'Đã xuất bản' };

        // Nếu client truyền lên yêu cầu xem tất cả (chỉ cho phép khi tích hợp kiểm tra admin ở client/route)
        if (showAll === 'true') {
            delete query.status;
        }

        if (category) query.category = category;
        if (tag) query.tags = { $in: [tag] };
        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { summary: { $regex: keyword, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await Blog.countDocuments(query);
        const blogs = await Blog.find(query)
            .populate('author', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            total,
            currentPage: Number(page),
            pages: Math.ceil(total / limit),
            data: blogs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. LẤY CHI TIẾT THEO SLUG
export const getBlogBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOneAndUpdate(
            { slug: req.params.slug, status: 'Đã xuất bản' },
            { $inc: { views: 1 } },
            { new: true }
        ).populate('relatedProducts').populate('author', 'name');

        if (!blog) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại hoặc chưa được xuất bản' });

        res.status(200).json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. TẠO BÀI VIẾT MỚI
export const createBlog = async (req, res) => {
    try {
        const blogData = { ...req.body, author: req.user._id };
        const newBlog = await Blog.create(blogData);
        res.status(201).json({ success: true, data: newBlog });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 4. CẬP NHẬT BÀI VIẾT (Sửa lỗi không đổi slug)
export const updateBlog = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Nếu thay đổi tiêu đề thì phải cập nhật lại cả slug tương ứng
        if (updateData.title) {
            updateData.slug = slugify(updateData.title);
        }

        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });

        res.status(200).json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. XÓA BÀI VIẾT
export const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });

        res.status(200).json({ success: true, message: 'Đã xóa bài viết thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. LẤY BÀI VIẾT LIÊN QUAN
export const getRelatedBlogs = async (req, res) => {
    try {
        const { category, currentId } = req.query;

        const filter = { status: 'Đã xuất bản' };
        if (category) filter.category = category;
        if (currentId) filter._id = { $ne: currentId }; // Loại trừ bài viết hiện tại đang đọc

        const blogs = await Blog.find(filter).limit(4).sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: blogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};