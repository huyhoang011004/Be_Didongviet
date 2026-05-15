// Mô hình dữ liệu đơn hàng của Di Động Việt
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Danh sách sản phẩm trong đơn hàng (iPhone, Samsung, MacBook, Phụ kiện...) [1, 2]
    orderItems: [
        {
            name: { type: String, required: true },
            qty: { type: Number, required: true },
            image: { type: String, required: true },
            price: { type: Number, required: true }, // Giá tại thời điểm mua (đã giảm Flash Sale) [2, 3]
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            }
        }
    ],
    // Thông tin nhận hàng của khách hàng [4]
    shippingAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true }
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
    discountHSSV: { type: Number, default: 0.0 }, // Giảm thêm từ 200K - 600K cho HSSV [7, 8]
    discountDMember: { type: Number, default: 0.0 }, // Giảm thêm 1% cho thành viên D.Member [2, 9]
    tradeInBonus: { type: Number, default: 0.0 }, // Trợ giá Thu cũ đổi mới (lên đến 5 triệu) [9, 10]

    shippingPrice: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    // Quản lý trạng thái đơn hàng để hỗ trợ tra cứu [1]
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },
    orderStatus: {
        type: String,
        required: true,
        default: 'Đang xử lý',
        enum: ['Đang xử lý', 'Đã xác nhận', 'Đang giao hàng', 'Đã hoàn thành', 'Đã hủy']
    }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);