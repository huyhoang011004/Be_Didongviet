import mongoose from 'mongoose';
import Account from '#auth/Auth.model.js';
const contactSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        enum: ['Tư vấn mua hàng', 'Khiếu nại dịch vụ', 'Hỗ trợ kỹ thuật', 'Thu cũ đổi mới', 'Khác'],
        default: 'Tư vấn mua hàng'
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['Chưa xử lý', 'Đang xử lý', 'Đã giải quyết', 'Đã hủy'],
        default: 'Chưa xử lý'
    },
    adminNotes: {
        type: String,
        default: '' // Ghi chú của nhân viên CSKH khi gọi điện xử lý với khách
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        default: null // ID của Admin/Nhân viên tiếp nhận xử lý ca này
    }
}, { timestamps: true });

// Tạo index để Admin tìm kiếm thông tin phản hồi theo trạng thái hoặc số điện thoại cho nhanh
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ phone: 1 });

export default mongoose.model('Contact', contactSchema);