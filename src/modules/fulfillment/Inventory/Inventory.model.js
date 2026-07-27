import mongoose from "mongoose";
import Branch from "#branch/Branch.model.js";

const inventorySchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        sku: {
            type: String,
            required: true,
            index: true, // Đánh index để nhân viên quét barcode/vạch tìm kiếm siêu nhanh
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
            index: true,
        },
        stock: {
            type: Number,
            required: true,
            default: 0,
            min: [0, "Số lượng tồn kho không được nhỏ hơn 0"],
        },
        lowStockThreshold: {
            type: Number,
            default: 5,
            min: 0,
        } // Ngưỡng cảnh báo sắp hết hàng riêng cho SKU tại chi nhánh này

    },
    { timestamps: true }
);

// Ràng buộc hỗn hợp: Đảm bảo 1 SKU tại 1 Chi nhánh chỉ có duy nhất 1 bản ghi số lượng tồn kho
inventorySchema.index({ sku: 1, branch: 1 }, { unique: true });

export default mongoose.model("Inventory", inventorySchema);