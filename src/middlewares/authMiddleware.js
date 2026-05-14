import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const { ACCESS_TOKEN_SECRET } = process.env;

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Lấy token từ header
            token = req.headers.authorization.split(' ')[1];

            // Giải mã token
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

            // Gắn thông tin người dùng vào request 
            req.user = await User.findById(decoded._id).select('-password');

            next();

        } catch (error) {
            res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn hạn' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Không có token, quyền truy cập bị từ chối' });
    }


};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Quyền truy cập bị từ chối: Chỉ dành cho Admin'
        });
    }
};

const adminRole = [protect, admin];
const validateUserFields = (req, res, next) => {
    const { email, phone } = req.body;

    // 1. Kiểm tra định dạng Email nếu có gửi lên
    if (email) {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Định dạng Email không hợp lệ (Ví dụ đúng: name@gmail.com)'
            });
        }
        // Chuẩn hóa dữ liệu: Chuyển về chữ thường và xóa khoảng trắng thừa
        req.body.email = email.trim().toLowerCase();
    }

    // 2. Kiểm tra định dạng Số điện thoại Việt Nam nếu có gửi lên
    if (phone) {
        // Regex kiểm tra các đầu số di động phổ biến tại VN (03, 05, 07, 08, 09 hoặc +84)
        const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không đúng định dạng Việt Nam (Gồm 10 số, bắt đầu bằng 0 hoặc +84)'
            });
        }
        // Chuẩn hóa dữ liệu: Xóa khoảng trắng thừa
        req.body.phone = phone.trim();
    }

    next();
};

export { protect, adminRole, validateUserFields };