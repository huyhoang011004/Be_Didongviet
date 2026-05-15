import mongoose from 'mongoose';
import slugify from '#utils/slugify.js';

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    image: { type: String, required: true },
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
productSchema.pre('save', async function () {
    if (!this.isModified('name')) return;

    this.slug = slugify(this.name);

});

// Tạo Virtual Field để trả về URL ảnh đầy đủ
// Giúp Frontend chỉ cần gọi product.imageUrl là hiển thị được ngay
productSchema.virtual('imageUrl').get(function () {
    if (!this.image) return null;
    // Nếu image đã là link full (http...) thì giữ nguyên, nếu không thì nối với host
    if (this.image.startsWith('http')) return this.image;
    return `${process.env.BASE_URL || 'http://localhost:5000'}${this.image}`;
});



// Virtual: Tính khoảng giá từ variants
productSchema.virtual('priceRange').get(function () {

    const variants = Array.isArray(this.variants)
        ? this.variants
        : [];

    if (variants.length === 0) {
        return null;
    }

    const prices = variants.map(
        v => v.salePrice || v.price || 0
    );

    return {
        min: Math.min(...prices),
        max: Math.max(...prices)
    };

});

// Virtual: Tổng tồn kho từ tất cả variants
productSchema.virtual('totalStock').get(function () {

    const variants = Array.isArray(this.variants)
        ? this.variants
        : [];

    return variants.reduce((total, variant) => {
        return total + (variant.stock || 0);
    }, 0);

});

export default mongoose.model('Product', productSchema);