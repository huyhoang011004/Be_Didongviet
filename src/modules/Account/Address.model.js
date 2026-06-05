import mongoose from "mongoose";
const addressSchema = new mongoose.Schema({
    province: { type: String, required: true },     // Tỉnh / Thành phố
    district: { type: String, required: true },     // Quận / Huyện
    ward: { type: String, required: true },         // Phường / Xã
    streetAddress: { type: String, required: true }, // Số nhà, tên đường, tòa nhà
    isDefault: { type: Boolean, default: false }    // Đánh dấu địa chỉ mặc định để ưu tiên lấy ra
});

export default addressSchema;