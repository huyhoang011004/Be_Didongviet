import Blog from '../models/Blog.js';

// 1. LẤY DANH SÁCH BÀI VIẾT (Có phân trang & Lọc)
export const getAllBlogs = async (req, res) => {
    try {
        const { category, tag, keyword, page = 1, limit = 10 } = req.query;
        let query = { status: 'Published' }; // Chỉ hiện bài đã xuất bản cho khách

        // Nếu là Admin muốn xem tất cả bài (kể cả Draft) có thể thêm check role ở đây
        if (req.user && req.user.role === 'admin') delete query.status;

        if (category) query.category = category;
        if (tag) query.tags = { $in: [tag] };
        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { summary: { $regex: keyword, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        const total = await Blog.countDocuments(query);
        const blogs = await Blog.find(query)
            .populate('author', 'name') // Lấy tên người viết
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            total,
            currentPage: page,
            pages: Math.ceil(total / limit),
            data: blogs
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. LẤY CHI TIẾT THEO SLUG (Tăng views)
export const getBlogBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOneAndUpdate(
            { slug: req.params.slug },
            { $inc: { views: 1 } },
            { new: true }
        ).populate('relatedProducts').populate('author', 'name');

        if (!blog) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });

        res.status(200).json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. TẠO BÀI VIẾT MỚI (ADMIN/STAFF)
export const createBlog = async (req, res) => {
    try {
        // Gán author là người đang đăng nhập (req.user._id từ authMiddleware)
        const blogData = { ...req.body, author: req.user._id };
        const newBlog = await Blog.create(blogData);

        res.status(201).json({ success: true, data: newBlog });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 4. CẬP NHẬT BÀI VIẾT (ADMIN/STAFF)
export const updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });

        res.status(200).json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. XÓA BÀI VIẾT (ADMIN)
export const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });

        res.status(200).json({ success: true, message: 'Đã xóa bài viết thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. LẤY BÀI VIẾT LIÊN QUAN (Theo category)
export const getRelatedBlogs = async (req, res) => {
    try {
        const { category, currentId } = req.query;
        const blogs = await Blog.find({
            category,
            _id: { $ne: currentId },
            status: 'Published'
        }).limit(4).sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: blogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};