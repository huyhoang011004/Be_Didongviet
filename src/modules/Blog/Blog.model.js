import mongoose from 'mongoose';
import slugify from '#utils/slugify.js';

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Vui lòng nhập tiêu đề bài viết'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        index: true
    },
    content: {
        type: String,
        required: [true, 'Vui lòng nhập nội dung bài viết']
    },
    // Mô tả ngắn để hiển thị ở trang danh sách bài viết và SEO Meta
    summary: {
        type: String,
        required: [true, 'Vui lòng nhập mô tả ngắn'],
        maxLength: 300
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Liên kết đến tài khoản Admin/Staff đã viết bài
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Công nghệ', 'Đánh giá', 'Khuyến mãi', 'Tư vấn', 'Tin mới'],
        default: 'Công nghệ'
    },
    featuredImage: {
        type: String,
        required: true
    },
    relatedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    // Quản lý trạng thái bài viết (Lưu nháp hoặc Đã xuất bản)
    status: {
        type: String,
        enum: ['Lưu nháp', 'Đã xuất bản'],
        default: 'Lưu nháp'
    },
    views: {
        type: Number,
        default: 0
    },
    tags: [String],
    // Tối ưu SEO nâng cao
    metaTitle: { type: String },
    metaDescription: { type: String }
}, { timestamps: true });

// Tự động tạo slug trước khi lưu
blogSchema.pre('save', function (next) {
    if (this.isModified('title')) {
        this.slug = slugify(this.title);
    }
    next();
});

export default mongoose.model('Blog', blogSchema);