import mongoose from 'mongoose';
import slugify from '../utils/slugify.js';

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, required: true },
    description: { type: String },
    ratings: { type: Number, default: 0 },
    slug: { type: String, unique: true },

    // CHI TIẾT CÁC PHIÊN BẢN (Màu, RAM, ROM)
    variants: [
        {
            color: { type: String, required: true }, // Ví dụ: Titan Sa Mạc, Đen Huyền Bí
            ram: { type: String, required: true }, // Ví dụ: 8GB, 12GB
            rom: { type: String, required: true }, // Ví dụ: 128GB, 256GB, 1TB
            price: { type: Number, required: true }, // Giá gốc của bản này
            salePrice: { type: Number }, // Giá khuyến mãi riêng cho bản này
            stock: { type: Number, default: 0 }, // Tồn kho riêng cho bản này
            sku: { type: String, unique: true }, // Mã định danh kho hàng (ví dụ: IP16PM-256-GOLD)
            variantImage: { type: String } // Ảnh riêng cho màu đó
        }
    ],

    // Logic đặc thù Di Động Việt
    isUsed: { type: Boolean, default: false },
    discountDMember: { type: Number, default: 1 },
    tradeInBonus: { type: Number, default: 0 }, // Tiền thưởng khi thu cũ đổi mới

}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Tự động tạo slug
productSchema.pre('save', function (next) {
    if (!this.isModified('name')) return next();
    this.slug = slugify(this.name);
    next();
});

export default mongoose.model('Product', productSchema);