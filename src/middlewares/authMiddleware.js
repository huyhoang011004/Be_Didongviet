import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Lấy token từ header
            token = req.headers.authorization.split(' ')[1];

            // Giải mã token
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

            // Gắn thông tin người dùng vào request (bao gồm trạng thái D.Member và HSSV)
            req.user = await User.findById(decoded.id).select('-password');

            next();
        } catch (error) {
            res.status(401).json({ success: false, message: 'Không có quyền truy cập, token lỗi' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Không có token, quyền truy cập bị từ chối' });
    }
};

export { protect };