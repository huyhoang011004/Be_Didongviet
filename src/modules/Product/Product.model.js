import mongoose from 'mongoose';
import slugify from '#utils/slugify.js';
import Branch from '../Branch/Branch.model.js';
const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    images: [{
        url: { type: String, required: true },
        isThumbnail: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
        alt: { type: String, default: '' }
    }],
    video: { type: String, default: null },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, required: true },
    description: { type: String },
    // Bổ sung vào productSchema của bạn
    ratingsAverage: { type: Number, default: 0 }, // Điểm trung bình số sao
    ratingsCount: { type: Number, default: 0 },    // Tổng số lượt đánh giá
    slug: { type: String, unique: true },

    // CHI TIẾT CÁC PHIÊN BẢN
    variants: [{
        color: { type: String, required: true }, // Ví dụ: Titan Sa Mạc, Đen Huyền Bí
        ram: { type: String, required: true }, // Ví dụ: 8GB, 12GB
        rom: { type: String, required: true }, // Ví dụ: 128GB, 256GB, 1TB
        price: { type: Number, required: true }, // Giá gốc của bản này
        salePrice: { type: Number }, // Giá khuyến mãi riêng cho bản này
        inventory: [{
            branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
            stock: { type: Number, default: 0 }
        }],
        sku: { type: String, unique: true }, // Mã định danh kho hàng (ví dụ: IP16PM-256-GOLD)
        variantImage: {
            type: String,
            default: null
        }, // Ảnh riêng cho phiên bản này (nếu có)
    }],

    // Logic đặc thù Di Động Việt
    isUsed: { type: Boolean, default: false },
    discountDMember: { type: Number, default: 1 },
    tradeInBonus: { type: Number, default: 0 }, // Tiền thưởng khi thu cũ đổi mới
    isActive: { type: Boolean, default: true } // Trạng thái kích hoạt sản phẩm

}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Tự động tạo slug
productSchema.pre('save', async function () {
    if (!this.isModified('name')) return;

    this.slug = slugify(this.name);

});

// Tạo Virtual Field để trả về URL ảnh đầy đủ
// Giúp Frontend chỉ cần gọi product.imageUrl là hiển thị được ngay
productSchema.virtual('imageUrl').get(function () {
    if (!this.images || this.images.length === 0) return null;
    // Nếu image đã là link full (http...) thì giữ nguyên, nếu không thì nối với host
    if (this.images[0].url.startsWith('http')) return this.images[0].url;
    return `${process.env.BASE_URL || 'http://localhost:5000'}${this.images[0].url}`;
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

// Virtual: Tổng tồn kho từ tất cả variants và tất cả chi nhánh
productSchema.virtual('totalStock').get(function () {
    const variants = Array.isArray(this.variants) ? this.variants : [];

    return variants.reduce((total, variant) => {
        // Cộng tổng stock từ mảng inventory của từng variant
        const variantTotalStock = (variant.inventory || []).reduce((sum, inv) => {
            return sum + (inv.stock || 0);
        }, 0);
        return total + variantTotalStock;
    }, 0);
});

export default mongoose.model('Product', productSchema);