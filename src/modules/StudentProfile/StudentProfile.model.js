import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Đảm bảo mỗi user chỉ có duy nhất 1 hồ sơ HSSV
    },
    studentCardImage: { type: String, required: true }, // URL ảnh thẻ SV để Admin duyệt
    studentIdCard: { type: String, required: true },    // Mã số SV
    schoolName: { type: String, required: true },       // Tên trường
    citizenId: {
        type: String,
        unique: true,
        sparse: true // Chỉ unique đối với những ai khai báo hồ sơ này
    },
    isHSSVVerified: {
        type: String,
        enum: ['Chưa xác thực', 'Đang chờ', 'Đã xác thực', 'Bị từ chối'],
        default: 'Đang chờ' // Khi tạo hồ sơ sẽ chuyển sang trạng thái chờ duyệt
    },
    rejectedReason: { type: String } // Lý do từ chối (nếu có)
}, { timestamps: true });

export default mongoose.model('StudentProfile', studentProfileSchema);