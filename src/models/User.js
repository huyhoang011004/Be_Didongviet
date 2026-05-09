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
        required: [true, 'Vui lòng nhập số điện thoại'],
        unique: true
    },
    address: { type: String },

    // Phân quyền người dùng
    role: {
        type: String,
        enum: ['user', 'admin', 'staff'],
        default: 'user'
    },

    // Thành viên D.Member
    isDMember: {
        type: Boolean,
        default: false
    },

    // Đối tượng Học sinh sinh viên
    isHSSV: {
        type: Boolean,
        default: false
    },

    // Thông tin xác thực HSSV
    studentCardImage: { type: String }, // Lưu URL ảnh thẻ
    studentIdCard: { type: String },
    schoolName: { type: String }, // Tên trường: ĐH Bách Khoa, ĐH Kinh Tế...
    // citizenId: Số CCCD 
    citizenId: {
        type: String,
        unique: true,
        sparse: true // Chỉ unique cho những ai có điền (HSSV), khách thường không có sẽ không bị lỗi
    },

    isHSSVVerified: {
        type: String,
        enum: ['Chưa xác thực', 'Đang chờ', 'Đã xác thực', 'Bị từ chối'],
        default: 'Chưa xác thực'
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
    }]
}, { timestamps: true });

// Tạo index duy nhất cho cặp (Trường + Mã số)
// Điều này cho phép Mã 123 ở trường A và Mã 123 ở trường B cùng tồn tại
userSchema.index({ studentIdCard: 1, schoolName: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);