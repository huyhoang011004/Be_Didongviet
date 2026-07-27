import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Mã voucher không được để trống'],
        unique: true,
        uppercase: true,
        trim: true // Tự động xóa khoảng trắng thừa ở 2 đầu
    },
    description: { type: String, trim: true },

    // Loại giảm giá phổ thông
    discountType: {
        type: String,
        enum: ['fixed', 'percentage', 'hssv_tiered'],
        required: [true, 'Loại giảm giá bắt buộc phải chọn']
    },

    // Dùng cho loại fixed hoặc percentage phổ thông
    discountValue: {
        type: Number,
        min: [0, 'Giá trị giảm không được nhỏ hơn 0'],
        required: function () {
            // Chỉ bắt buộc nhập nếu KHÔNG PHẢI là loại phân tầng hssv
            return this.discountType !== 'hssv_tiered';
        }
    },

    maxDiscount: {
        type: Number,
        min: [0, 'Mức giảm tối đa không được nhỏ hơn 0']
    },    // Số tiền giảm tối đa nếu là loại percentage

    minOrderAmount: {
        type: Number,
        default: 0,
        min: [0, 'Giá trị đơn hàng tối thiểu không được nhỏ hơn 0']
    }, // Dùng cho voucher thường

    // Cấu hình đặc quyền cho Học sinh Sinh viên
    isHSSVOnly: { type: Boolean, default: false }, // Đúng = Chỉ tài khoản đã xác thực HSSV mới áp được

    // Mảng cấu hình các mức giảm cho HSSV
    hssvTiers: {
        type: [
            {
                minOrderValue: { type: Number, required: true, min: 0 },
                discountAmount: { type: Number, required: true, min: 0 }
            }
        ],
        default: [],
        required: function () {
            // Bắt buộc phải có cấu hình tầng nếu chọn loại hssv_tiered
            return this.discountType === 'hssv_tiered';
        }
    },

    startDate: {
        type: Date,
        required: [true, 'Ngày bắt đầu không được để trống']
    },
    expiryDate: {
        type: Date,
        required: [true, 'Ngày hết hạn không được để trống'],
        validate: {
            validator: function (value) {
                // Ngày hết hạn phải sau ngày bắt đầu
                return value > this.startDate;
            },
            message: 'Ngày hết hạn phải sau ngày bắt đầu sử dụng mã'
        }
    },

    // ĐIỀU CHỈNH LƯỢT DÙNG CHỐNG SPAM
    usageLimit: {
        type: Number,
        required: true,
        default: 100,
        min: [1, 'Tổng lượt dùng phải tối thiểu là 1']
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    maxUsagePerUser: {
        type: Number,
        default: 1, // Mặc định mỗi user chỉ được dùng 1 lần duy nhất
        min: [1, 'Lượt dùng tối đa của mỗi user phải tối thiểu là 1']
    },

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Tối ưu hóa hiệu năng truy vấn (Indexing)
// Vì hệ thống sẽ tìm kiếm voucher liên tục dựa trên CODE và trạng thái thời gian, việc đánh index là cực kỳ quan trọng
voucherSchema.index({ code: 1, isActive: 1, startDate: 1, expiryDate: 1 });

export default mongoose.model('Voucher', voucherSchema);