import mongoose from 'mongoose';

const inventoryConfigSchema = new mongoose.Schema({
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    description: { type: String, default: 'Ngưỡng cảnh báo sản phẩm sắp hết hàng' }
}, { timestamps: true });

export default mongoose.model('InventoryConfig', inventoryConfigSchema);
