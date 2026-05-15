import mongoose from 'mongoose';
import slugify from '#utils/slugify.js';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên danh mục'],
        unique: true,
        trim: true
    }, // Ví dụ: Điện thoại, Máy cũ giá rẻ

    slug: {
        type: String,
        unique: true,
        index: true
    }, // dien-thoai, may-cu-gia-re

    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    }, // Quản lý danh mục cha-con

    image: { type: String },

    description: { type: String },

    // Thương hiệu: Apple (AAR), Samsung, Xiaomi...
    brands: [{ type: String }],

    displayOrder: {
        type: Number,
        default: 0
    },

    // Thêm trường để ẩn/hiện danh mục trên Menu Di Động Việt
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Tự động tạo slug trước khi lưu
categorySchema.pre('save', async function () {
    if (this.isModified('name') && this.name) {
        this.slug = slugify(this.name);
    }
});

export default mongoose.model('Category', categorySchema);