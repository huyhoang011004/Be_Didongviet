import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },

    // Loại giảm giá phổ thông
    discountType: { type: String, enum: ['fixed', 'percentage', 'hssv_tiered'], required: true },
    discountValue: { type: Number }, // Dùng cho loại fixed hoặc percentage phổ thông
    maxDiscount: { type: Number },    // Số tiền giảm tối đa nếu là loại percentage
    minOrderAmount: { type: Number, default: 0 }, // Dùng cho voucher thường

    // Cấu hình đặc quyền cho Học sinh Sinh viên
    isHSSVOnly: { type: Boolean, default: false }, // Đúng = Chỉ tài khoản đã xác thực HSSV mới áp được

    // Mảng cấu hình các mức giảm cho HSSV (Ví dụ: Đơn > 10tr giảm 200k, Đơn > 20tr giảm 600k)
    hssvTiers: [
        {
            minOrderValue: { type: Number, required: true }, // Mức giá trị đơn tối thiểu
            discountAmount: { type: Number, required: true } // Số tiền được giảm tương ứng
        }
    ],

    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Voucher', voucherSchema);