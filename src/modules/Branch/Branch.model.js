import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true }, // VD: Di Động Việt - Cầu Giấy
    address: { type: String, required: true },
    phone: { type: String, required: true },
    managerName: { type: String }, // Tên quản lý chi nhánh
    isActive: { type: Boolean, default: true }, // Để tạm đóng cửa hoặc bảo trì
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere' } // Kinh độ, vĩ độ nếu muốn làm tìm chi nhánh gần nhất
    }
}, { timestamps: true });

export default mongoose.model('Branch', branchSchema);