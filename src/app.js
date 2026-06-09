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

// Route Registry - Tập trung tất cả routes
import { registerRoutes } from '#routes/index.js';

dotenv.config();
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();

// --- MIDDLEWARES HỆ THỐNG ---
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
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

// --- API ENDPOINTS (Đăng ký qua Route Registry) ---
registerRoutes(app);

app.get('/', (req, res) => {
    res.send('API Di Động Việt đang hoạt động ổn định...');
});

// --- XỬ LÝ LỖI ---
app.use(notFound);
app.use(errorHandler);

export default app;