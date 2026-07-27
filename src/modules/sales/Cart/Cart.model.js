import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        unique: true
    },

    items: {
        type: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },

                variantId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true
                },

                quantity: {
                    type: Number,
                    required: true,
                    default: 1,
                    min: 1
                },

                selectedColor: String,
                selectedStorage: String,

                price: {
                    type: Number,
                    required: true
                }
            }
        ],
        default: []
    },

    totalPrice: { // Lưu số tiền gốc trong DB
        type: Number,
        default: 0
    },

    appliedVoucher: {
        type: String,
        default: null,
        uppercase: true
    },

    discountAmount: { // Lưu số tiền được giảm vào DB
        type: Number,
        default: 0
    },
    finalPrice: { // Lưu số tiền sau giảm vào DB
        type: Number,
        default: 0
    }

}, { timestamps: true });

// Middleware xử lý tự động trước khi lưu vào DB
cartSchema.pre('save', async function () {
    const items = Array.isArray(this.items) ? this.items : [];

    // 1. Tính toán lại tổng tiền hàng gốc
    this.totalPrice = items.reduce((sum, item) => {
        return sum + ((item.price || 0) * (item.quantity || 0));
    }, 0);

    // 2. Nếu giỏ hàng trống -> Xóa sạch dấu vết Voucher và đưa tiền giảm về 0
    if (items.length === 0) {
        this.appliedVoucher = null;
        this.discountAmount = 0;
        this.finalPrice = 0;
    } else {
        // Nếu có hàng nhưng không áp mã, finalPrice bằng đúng totalPrice
        if (!this.appliedVoucher) {
            this.discountAmount = 0;
            this.finalPrice = this.totalPrice;
        } else {
            // Đảm bảo finalPrice không bị âm tiền
            this.finalPrice = Math.max(0, this.totalPrice - (this.discountAmount || 0));
        }
    }
});

export default mongoose.model('Cart', cartSchema);