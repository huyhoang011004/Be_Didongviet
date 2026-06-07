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

      // 3. REVIEW UPLOAD (ảnh + video đánh giá)
      if (req.originalUrl.includes("/reviews/")) {
        const folder = "uploads/reviews";
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

    // Trường hợp upload ảnh/video review
    if (req.originalUrl.includes("/reviews/")) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
      if (file.fieldname === "reviewVideo") {
        return cb(null, `review-video-${uniqueSuffix}${ext}`);
      }
      return cb(null, `review-img-${uniqueSuffix}${ext}`);
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

const fileFilter = (req, file, cb) => {
  // Cho phép video với fieldname reviewVideo
  if (file.fieldname === "reviewVideo") {
    const allowedVideoTypes = /mp4|mov|avi|webm|mkv/;
    const allowedVideoMimes = /video\/(mp4|quicktime|x-msvideo|webm|x-matroska)/;
    const extension = allowedVideoTypes.test(
      path.extname(file.originalname).toLowerCase().replace(".", ""),
    );
    const mimetype = allowedVideoMimes.test(file.mimetype);
    if (extension || mimetype) {
      return cb(null, true);
    }
    return cb(new Error("Chỉ chấp nhận định dạng video (mp4, mov, avi, webm)"));
  }

  // Cho phép ảnh với fieldname reviewImages
  if (file.fieldname === "reviewImages") {
    const allowedImageTypes = /jpeg|jpg|png|webp|avif|heic/;
    const extension = allowedImageTypes.test(
      path.extname(file.originalname).toLowerCase().replace(".", ""),
    );
    const mimetype = /image\/(jpeg|jpg|png|webp|avif|heic)/.test(file.mimetype);
    if (extension || mimetype) {
      return cb(null, true);
    }
    return cb(new Error("Chỉ chấp nhận định dạng ảnh"));
  }

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
    fileSize: 200 * 1024 * 1024, // 200MB (video review trước khi nén)
  },
  fileFilter,
});

// Upload riêng cho product với giới hạn 5MB
export const uploadProduct = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
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
  },
});

export default upload;
