import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import cookieParser from 'cookie-parser';

// Cấu hình & Database
import connectDB from '#config/db.js';
import { notFound, errorHandler } from '#middlewares/error.middleware.js';

// Routes
import authRoute from '#auth/auth.route.js';
import productRoute from '#product/product.route.js';
import accountRoute from '#account/account.route.js';
import orderRoute from '#order/order.route.js';
import categoryRoute from '#category/Admin/category.route.js';
import voucherRoute from '#voucher/voucher.route.js';
import cartRoute from '#cart/cart.route.js';
import blogRoute from '#blog/blog.route.js';
import studentProfileRoute from '#studentProfile/studentProfile.route.js';

dotenv.config();
connectDB();

const app = express();

// --- MIDDLEWARES HỆ THỐNG ---
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Hỗ trợ đọc dữ liệu form phức tạp
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// --- PHỤC VỤ FILE TĨNH ---
// Giúp hiển thị ảnh sản phẩm và ảnh thẻ HSSV trên trình duyệt
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- API ENDPOINTS ---
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/products', productRoute);
app.use('/api/v1/accounts', accountRoute);
app.use('/api/v1/orders', orderRoute);
app.use('/api/v1/categories', categoryRoute);
app.use('/api/v1/vouchers', voucherRoute);
app.use('/api/v1/cart', cartRoute);
app.use('/api/v1/blogs', blogRoute);
app.use('/api/v1/student-profile', studentProfileRoute);
app.get('/', (req, res) => {
    res.send('API Di Động Việt đang hoạt động ổn định...');
});

// --- XỬ LÝ LỖI ---
app.use(notFound);
app.use(errorHandler);

export default app;