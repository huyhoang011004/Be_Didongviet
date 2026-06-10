import mongoose from 'mongoose';
import Account from '#account/Account.model.js';

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    // Danh sách sản phẩm trong đơn hàng 
    orderItems: [
        {
            imei: [{ type: String }],
            name: { type: String, required: true },
            qty: { type: Number, required: true }, // Số lượng đặt mua
            image: { type: String, required: true },
            price: { type: Number, required: true }, // Giá tại thời điểm mua 
            importPrice: { type: Number, default: 0 }, // Giá nhập - tính lợi nhuận
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            variantId: {
                type: mongoose.Schema.Types.ObjectId,
                required: false
            },
            selectedColor: { type: String, default: '' },
            selectedStorage: { type: String, default: '' },
            sku: { type: String, default: '' }
        }
    ],
    deliveryBranch: {
        name: String,
        address: String
    },
    // Thông tin nhận hàng của khách hàng 
    shippingAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        province: { type: String, required: true },
        district: { type: String, required: true },
        ward: { type: String, required: true },
        streetAddress: { type: String, required: true }
    },
    // Phương thức thanh toán: COD, VNPAY hoặc Trả góp 0% [5]
    paymentMethod: {
        type: String,
        required: true,
        enum: ['COD', 'VNPAY', 'Trả góp 0%']
    },
    // Chi tiết thanh toán (Dùng để tích hợp với hướng dẫn thanh toán VNPAY) [5, 6]
    paymentResult: {
        id: { type: String },
        status: { type: String },
        update_time: { type: String }
    },
    // Các mức chiết khấu đặc biệt của Di Động Việt
    itemsPrice: { type: Number, required: true, default: 0.0 },
    discountDMember: { type: Number, default: 0.0 }, // Ưu đãi D.Member 
    tradeInBonus: { type: Number, default: 0.0 }, // Trợ giá Thu cũ đổi mới 
    appliedVoucher: { type: String, default: null },
    discountVoucher: { type: Number, default: 0.0 },

    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    // Quản lý trạng thái đơn hàng để hỗ trợ tra cứu 
    isPaid: { type: Boolean, required: true, default: false }, // Đã thanh toán
    paidAt: { type: Date },
    isDelivered: { type: Boolean, required: true, default: false }, // Đã giao hàng
    deliveredAt: { type: Date },
    orderStatus: {
        type: String,
        required: true,
        default: 'Chờ xác nhận',
        enum: ['Chờ xác nhận', 'Chờ lấy hàng', 'Đang giao', 'Đã giao', 'Đã hủy', 'Trả hàng/Hoàn tiền']
    },
    returnReason: { type: String, default: '' },
    returnImages: [{ type: String }],
    returnVideos: [{ type: String }],
    returnCode: { type: String, default: '' },
    returnStatus: { type: String, default: 'none', enum: ['none', 'pending', 'approved', 'rejected'] },
    isReceived: { type: Boolean, default: false }, // Đã nhận hàng (dùng để khách hàng xác nhận đã nhận hàng)
    receivedAt: { type: Date } // Thời gian khách hàng nhận hàng
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
