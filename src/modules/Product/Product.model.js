import mongoose from "mongoose";
import slugify from "#utils/slugify.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    images: [
      {
        url: { type: String, required: true },
        isUploaded: { type: Boolean, default: false },
        isThumbnail: { type: Boolean, default: false },
        alt: { type: String, default: "" },
      },
    ],
    video: { type: String, default: null },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: String, required: true },
    description: { type: String },
    condition: { type: String, enum: ['Mới', 'LikeNew', 'Cũ'], default: 'Mới' },
    warrantyPeriod: { type: String, default: '12 tháng' },
    ratingsAverage: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 },
    discountDMember: { type: Number, default: 1 },
    tradeInBonus: { type: Number, default: 0 },
    slug: { type: String, unique: true },

    // CHI TIẾT CÁC PHIÊN BẢN
    variants: [
      {
        variantImage: { type: String, default: null },
        color: { type: String, required: true },
        ram: { type: String },
        rom: { type: String },
        price: { type: Number, required: true },
        salePrice: { type: Number },
        importPrice: { type: Number, default: 0 }, // Giá nhập - dùng tính lợi nhuận
        sku: { type: String, required: true, unique: true },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Tự động tạo slug
productSchema.pre("save", function (next) {
  if (!this.isModified("name")) return next();
  this.slug = slugify(this.name);
  next();
});

// Virtual imageUrl
productSchema.virtual("imageUrl").get(function () {
  if (!this.images || this.images.length === 0) return null;
  const firstImage = typeof this.images[0] === "string" ? this.images[0] : this.images[0].url;
  if (!firstImage) return null;
  if (firstImage.startsWith("http")) return firstImage;
  return `${process.env.BASE_URL || "http://localhost:5000"}${firstImage}`;
});

// Virtual priceRange
productSchema.virtual("priceRange").get(function () {
  const variants = Array.isArray(this.variants) ? this.variants : [];
  if (variants.length === 0) return null;
  const prices = variants.map((v) => v.salePrice || v.price || 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
});

// KẾT NỐI VIRTUAL VỚI COLLECTION INVENTORY
productSchema.virtual("inventories", {
  ref: "Inventory",
  localField: "_id",
  foreignField: "product",
});

export default mongoose.model("Product", productSchema);