import app from './src/app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server Di Động Việt chạy tại: http://localhost:${PORT}`);
});

// Xử lý lỗi hệ thống cực kỳ quan trọng cho đồ án
process.on('unhandledRejection', (err, promise) => {
    console.log(`Lỗi hệ thống: ${err.message}`);
    server.close(() => process.exit(1)); // Đóng server an toàn khi có lỗi nặng
});
