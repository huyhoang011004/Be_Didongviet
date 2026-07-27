import mongoose from "mongoose";
import slugify from "#utils/slugify.js";

const categorySchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: [true, "Vui lòng nhập tên danh mục"],
         unique: true,
         trim: true,
      }, // Ví dụ: Điện thoại, Máy cũ giá rẻ

      parentCategory: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Category",
         default: null,
      }, // Quản lý danh mục cha-con

      ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }], // Lưu tất cả cha/ông nội...

      image: { type: String },

      displayOrder: {
         type: Number,
         default: 0,
      }, // là số thứ tự hiển thị trên Menu Di Động Việt

      // Thêm trường để ẩn/hiện danh mục trên Menu Di Động Việt
      isActive: {
         type: Boolean,
         default: true,
      },

      slug: {
         type: String,
         unique: true,
         index: true,
      }, // dien-thoai, may-cu-gia-re
   },
   { timestamps: true },
);

// Tự động tạo slug trước khi lưu
categorySchema.pre("save", async function () {
   if (this.isModified("name") && this.name) {
      this.slug = slugify(this.name);
   }
});

export default mongoose.models.Category ||
   mongoose.model("Category", categorySchema);
