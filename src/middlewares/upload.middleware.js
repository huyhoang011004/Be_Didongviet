import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        req.isVerifyHssv = req.originalUrl.includes('verify-hssv');
        let folder = req.isVerifyHssv ? 'uploads/verify/' : 'uploads/products/';

        // Kiểm tra và tự động tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        cb(null, folder);
    },
    filename: (req, file, cb) => {
        // Prefix tên file để dễ phân loại trong thư mục
        const prefix = req.isVerifyHssv ? 'hssv-' : 'prod-';
        cb(null, `${prefix}${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|webp/;
    const extension = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);

    if (extension && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận định dạng ảnh (jpeg, jpg, png, webp)'));
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

export default upload;