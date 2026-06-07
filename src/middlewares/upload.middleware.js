import multer from "multer";
import path from "path";
import fs from "fs";
import slugify from "#utils/slugify.js";

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // 1. AVATAR UPLOAD
      if (file.fieldname === "avatar") {
        const folder = "uploads/avatars";
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }
        return cb(null, folder);
      }

      // 2. VERIFY HSSV
      if (req.originalUrl.includes("verify-hssv")) {
        const folder = "uploads/verify";
        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }
        return cb(null, folder);
      }

      const productId = req.params.id || req.productId;
      if (!productId) {
        return cb(new Error("Thiếu ID sản phẩm cho thư mục upload"));
      }

      let productName = req.body.name;

      // Nếu là Update (có params.id) và thiếu thông tin từ body
      if (!productName && req.params.id) {
        const Product = (await import("#product/Product.model.js")).default;
        const product = await Product.findById(req.params.id);
        if (product) {
          productName = product.name;
        }
      }

      if (productName) {
        // ĐÍNH PRODUCT NAME VÀO REQ ĐỂ HÀM FILENAME BÊN DƯỚI SỬ DỤNG
        req.productSlugForFilename = slugify(productName);
      }

      // Full path: uploads/products/productId
      const uploadPath = path.join("uploads", "products", productId);

      // Tự tạo folder nếu chưa có
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },

  filename: async (req, file, cb) => {
    const ext = path.extname(file.originalname);

    // Trường hợp upload avatar
    if (file.fieldname === "avatar") {
      return cb(
        null,
        `avatar-${Date.now()}-${Math.round(Math.random() * 1e4)}${ext}`,
      );
    }

    // Trường hợp upload ảnh xác minh HSSV không cần đặt tên theo sản phẩm
    if (req.originalUrl.includes("verify-hssv")) {
      return cb(
        null,
        `hssv-${Date.now()}-${Math.round(Math.random() * 1e4)}${ext}`,
      );
    }

    const extLower = path.extname(file.originalname).toLowerCase();
    const fieldName = file.fieldname; // 'images', 'variantImages' hoặc 'image'

    if (fieldName === "images") {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
      return cb(null, `img-${uniqueSuffix}${ext}`);
    }

    if (fieldName === "variantImages") {
      const match = file.originalname.match(/^variant_(\d+)_/);
      const idx = match ? match[1] : "unknown";
      return cb(null, `variant_${idx}${ext}`);
    }

    // Trường hợp thay thế ảnh đơn lẻ với fieldname 'image'
    if (fieldName === "image" && req.params.id && req.params.imageId) {
      try {
        const Product = (await import("#product/Product.model.js")).default;
        const product = await Product.findById(req.params.id);
        if (product) {
          const image = product.images.id(req.params.imageId);
          if (image) {
            const oldFilename = path.basename(image.url);
            const oldNameWithoutExt = path.parse(oldFilename).name;
            return cb(null, `${oldNameWithoutExt}${ext}`);
          }
        }
      } catch (err) {
        console.error("Lỗi lấy tên tệp ảnh cũ:", err);
      }
    }

    // Các trường hợp khác làm dự phòng
    const randomSuffix = Math.round(Math.random() * 1e4);
    cb(null, `product-${randomSuffix}${ext}`);
  },
});

// Giữ nguyên fileFilter và cấu trúc export ở bên dưới file của bạn...

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|webp|avif/;

  const extension = allowedFileTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );

  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extension && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận định dạng ảnh"));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

export default upload;
