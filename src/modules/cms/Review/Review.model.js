import mongoose from 'mongoose';
import Product from '#product/Product.model.js';
import Account from '#account/Account.model.js';

const reviewSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false,
        index: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
        default: null // Nếu là null thì là comment gốc, nếu có ID thì là phản hồi (reply) của admin/user khác
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: function () { return this.parentId === null; } // Chỉ bắt buộc đánh giá sao đối với comment gốc
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    images: [{ type: String }], // Mảng chứa URL ảnh thực tế do khách chụp (tối đa 6)
    video: { type: String, default: null }, // URL video đánh giá (tối đa 1, tối đa 1 phút, 720p)
    isApproved: {
        type: Boolean,
        default: true // Tự động duyệt hoặc chuyển thành false nếu muốn Admin duyệt trước khi hiển thị
    }
}, { timestamps: true });

// Tránh việc một user đánh giá một sản phẩm quá nhiều lần trong cùng một đơn hàng
reviewSchema.index({ order: 1, product: 1, user: 1, parentId: 1 }, { unique: true, partialFilterExpression: { parentId: null } });

// Hàm Static tính toán trung bình số sao và tổng số đánh giá
reviewSchema.statics.calculateAverageRatings = async function (productId) {
    const stats = await this.aggregate([
        {
            $match: { product: productId, parentId: null, isApproved: true }
        },
        {
            $group: {
                _id: '$product',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);

    const Product = mongoose.model('Product');
    if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            ratingsCount: stats[0].nRating,
            ratingsAverage: Math.round(stats[0].avgRating * 10) / 10 // Làm tròn 1 chữ số thập phân (VD: 4.6)
        });
    } else {
        await Product.findByIdAndUpdate(productId, {
            ratingsCount: 0,
            ratingsAverage: 0
        });
    }
};

// Chạy tính toán lại sau khi lưu một review mới
reviewSchema.post('save', async function () {
    if (this.parentId === null) {
        await this.constructor.calculateAverageRatings(this.product);
    }
});

// Chạy tính toán lại sau khi xóa một review
reviewSchema.post(/^findOneAnd/, async function (doc) {
    if (doc && doc.parentId === null) {
        await doc.constructor.calculateAverageRatings(doc.product);
    }
});

export default mongoose.model('Review', reviewSchema);
