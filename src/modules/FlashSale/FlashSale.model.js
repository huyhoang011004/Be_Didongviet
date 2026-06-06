import mongoose from 'mongoose';

const flashSaleSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Ví dụ: "Flash Sale Cuối Tháng 5"
    startDate: { type: Date, required: true }, // Ngày X bắt đầu chuỗi ngày sale
    endDate: { type: Date, required: true },   // Ngày Y kết thúc chuỗi ngày sale

    // Danh sách các khung giờ cố định trong ngày (Ví dụ: [9, 12, 15, 21] nghĩa là 9h, 12h, 15h, 21h)
    timeSlots: [{ type: Number, required: true }],
    duration: { type: Number, default: 60 }, // Thời gian diễn ra mỗi khung giờ (tính bằng phút, ví dụ: 60 phút)

    // Danh sách sản phẩm tham gia Flash Sale
    products: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        flashSalePrice: { type: Number, required: true }, // Giá sale đặc biệt
        flashSaleStock: { type: Number, required: true }, // Số lượng mở bán giới hạn cho sale
        soldCount: { type: Number, default: 0 },         // Số lượng đã bán được trong đợt sale
        userLimit: { type: Number, default: 1 }           // Mỗi user được mua tối đa bao nhiêu sản phẩm giá này
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('FlashSale', flashSaleSchema);