import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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

    totalPrice: {
        type: Number,
        default: 0
    },

    appliedVoucher: {
        type: String,
        default: null
    },

    discountAmount: {
        type: Number,
        default: 0
    },

    finalPrice: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

cartSchema.pre('save', async function () {

    const items = Array.isArray(this.items)
        ? this.items
        : [];

    this.totalPrice = items.reduce((sum, item) => {
        return sum + (
            (item.price || 0) *
            (item.quantity || 0)
        );
    }, 0);

    this.finalPrice =
        this.totalPrice - (this.discountAmount || 0);

    if (this.finalPrice < 0) {
        this.finalPrice = 0;
    }
});

export default mongoose.model('Cart', cartSchema);