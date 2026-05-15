import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
            quantity: { type: Number, required: true, default: 1, min: 1 },

            // Thông tin hiển thị nhanh (snapshot)
            selectedColor: { type: String },
            selectedStorage: { type: String },
            price: { type: Number, required: true }
        }
    ]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Dùng Virtual để tính tổng tiền (không lưu vào DB, tính toán khi gọi API)
cartSchema.virtual('totalPrice').get(function () {
    return this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
});

export default mongoose.model('Cart', cartSchema);