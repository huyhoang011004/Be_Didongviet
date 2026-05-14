// Mô hình dữ liệu cho người dùng của Dịch vụ Di Động Việt
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên'],
        trim: true
    },

    email: {
        type: String,
        required: [true, 'Vui lòng nhập email'],
        unique: true,
        lowercase: true
    },

    password: {
        type: String,
        required: [true, 'Vui lòng nhập mật khẩu'],
        minlength: 6
    },

    phone: {
        type: String,
        unique: true,
        sparse: true,
    },

    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },

    address: { type: String },

    // Phân quyền người dùng
    role: {
        type: String,
        enum: ['user', 'admin', 'staff'],
        default: 'user'
    },

    membershipLevel: {
        type: String,
        enum: ['Tiêu chuẩn', 'Bạc', 'Vàng', 'Kim cương'],
        default: 'Tiêu chuẩn'
    },

    // Danh sách sản phẩm yêu thích
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],

    // Lịch sử tra cứu đơn hàng
    orderHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],

    // Các trường phục vụ xác thực OTP
    isVerified: { type: Boolean, default: false }, // Mặc định chưa xác thực
    otpCode: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });
// Khi trường `deletedAt` có giá trị, MongoDB sẽ tự động xóa cứng bản ghi này sau 60 ngày.
userSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 5184000 });

const User = mongoose.model('User', userSchema);
export default User;