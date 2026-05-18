import multer from 'multer';
import path from 'path';
import fs from 'fs';
import StudentProfile from '#studentProfile/StudentProfile.model.js';
import Product from '#product/Product.model.js';
import Category from '#category/category.model.js';
import slugify from '#utils/slugify.js';

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            // 1. VERIFY HSSV
            if (req.originalUrl.includes('verify-hssv')) {
                const folder = 'uploads/verify';
                if (!fs.existsSync(folder)) {
                    fs.mkdirSync(folder, { recursive: true });
                }
                return cb(null, folder);
            }

            let categoryId = req.body.category;
            let productName = req.body.name;
            let categoryData = null;

            // 2. Nếu là Update (có params.id) và thiếu thông tin từ body
            if ((!categoryId || !productName) && req.params.id) {
                const Product = (await import('#product/Product.model.js')).default;
                const product = await Product.findById(req.params.id).populate('category');

                if (product) {
                    categoryId = product.category?._id;
                    productName = product.name;
                    categoryData = product.category;
                }
            }

            if (!categoryId || !productName) {
                return cb(new Error('Thiếu category hoặc tên sản phẩm'));
            }

            // ĐÍNH PRODUCT NAME VÀO REQ ĐỂ HÀM FILENAME BÊN DƯỚI SỬ DỤNG
            req.productSlugForFilename = slugify(productName);

            // 3. Nếu chưa có categoryData, tiến hành query từ DB
            if (!categoryData) {
                categoryData = await Category.findById(categoryId);
            }

            if (!categoryData) {
                return cb(new Error('Không tìm thấy danh mục (Category) hợp lệ'));
            }

            // 4. Tạo path category cha/con
            let categoryPath = slugify(categoryData.name);

            if (categoryData.parentCategory) {
                const parent = await Category.findById(categoryData.parentCategory);
                if (parent) {
                    categoryPath = `${slugify(parent.name)}/${slugify(categoryData.name)}`;
                }
            }

            // Folder sản phẩm
            const productFolder = slugify(productName);

            // Full path
            const uploadPath = path.join('uploads', categoryPath, productFolder);

            // Tự tạo folder nếu chưa có
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }

            cb(null, uploadPath);

        } catch (error) {
            cb(error);
        }
    },

    filename: (req, file, cb) => {
        // Trường hợp upload ảnh xác minh HSSV không cần đặt tên theo sản phẩm
        if (req.originalUrl.includes('verify-hssv')) {
            const ext = path.extname(file.originalname);
            return cb(null, `hssv-${Date.now()}-${Math.round(Math.random() * 1E4)}${ext}`);
        }

        const ext = path.extname(file.originalname).toLowerCase();

        // Lấy slug tên sản phẩm đã đính ở req (nếu trống thì dùng mặc định 'product')
        const productSlug = req.productSlugForFilename || 'product';

        // Khởi tạo hoặc tăng biến đếm order dựa trên từng loại field (images hoặc variantImages)
        const fieldName = file.fieldname; // 'images' hoặc 'variantImages'

        // if (!req.imageOrderCounters) {
        //     req.imageOrderCounters = {};
        // }
        // if (req.imageOrderCounters[fieldName] === undefined) {
        //     req.imageOrderCounters[fieldName] = 0;
        // } else {
        //     req.imageOrderCounters[fieldName]++;
        // }

        // const currentOrder = req.imageOrderCounters[fieldName];
        const randomSuffix = Math.round(Math.random() * 1E4); // Số ngẫu nhiên ngắn giúp tên file gọn hơn

        // Định dạng tên file: iphone-16-pro-0-4829.jpg hoặc iphone-16-pro-variant-0-1284.jpg
        const suffixName = fieldName === 'variantImages' ? 'variant-' : '';
        const uniqueName = `${productSlug}-${suffixName}${randomSuffix}${ext}`;

        cb(null, uniqueName);
    }
});

// Giữ nguyên fileFilter và cấu trúc export ở bên dưới file của bạn...

const fileFilter = (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|webp/;

    const extension = allowedFileTypes.test(
        path.extname(file.originalname).toLowerCase()
    );

    const mimetype = allowedFileTypes.test(file.mimetype);

    if (extension && mimetype) {
        cb(null, true);
    } else {
        cb(new Error(
            'Chỉ chấp nhận định dạng ảnh'
        ));
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter
});

export default upload;