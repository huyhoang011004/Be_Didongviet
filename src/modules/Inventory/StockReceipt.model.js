import mongoose from 'mongoose';
import Product from '#product/Product.model.js';
import Branch from '#branch/Branch.model.js';
import Account from '#account/Account.model.js';
const stockReceiptSchema = new mongoose.Schema({
    receiptNumber: { type: String, unique: true, required: true }, // Mã phiếu: SR-2024-001
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantIndex: { type: Number, required: true }, // Chỉ số phiên bản
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    quantity: { type: Number, required: true, min: 1 }, // Số lượng nhập
    notes: { type: String, default: '' }, // Ghi chú
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }, // Người tạo phiếu
    receiptDate: { type: Date, default: Date.now }, // Ngày nhập hàng
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'completed' // Trạng thái: chờ xử lý, hoàn thành, huỷ
    }
}, { timestamps: true });

// Tự động tạo số phiếu
stockReceiptSchema.pre('validate', async function () {
    if (!this.isNew) return;

    const year = new Date().getFullYear();
    const lastReceipt = await mongoose.model('StockReceipt').findOne()
        .sort({ createdAt: -1 });

    let number = 1;
    if (lastReceipt && lastReceipt.receiptNumber) {
        const lastNumber = parseInt(lastReceipt.receiptNumber.split('-')[2]) || 0;
        number = lastNumber + 1;
    }

    this.receiptNumber = `SR-${year}-${String(number).padStart(3, '0')}`;
});

export default mongoose.model('StockReceipt', stockReceiptSchema);
