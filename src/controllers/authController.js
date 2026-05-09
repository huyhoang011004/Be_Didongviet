import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';


const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL;
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL;

export const signUp = async (req, res) => {
    try {
        const { name, email, password, phone, isHSSV } = req.body;

        // Kiểm tra xem người dùng đã nhập đầy đủ thông tin chưa
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin người dùng' });
        }

        // Kiểm tra email hoặc số điện thoại đã tồn tại chưa
        const userExists = await User.findOne({ $or: [{ email }, { phone }] });

        if (userExists) {
            return res.status(409).json({ success: false, message: 'Email hoặc số điện thoại đã tồn tại' });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10); // Sử dụng bcrypt để mã hóa mật khẩu với salt rounds là 10

        // Tạo người dùng mới 
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            isHSSV: isHSSV || false // Xác định ngay từ đầu để áp dụng ưu đãi HSSV 
        });

        return res.status(204).json({ success: true, message: 'Đăng ký thành công' });

    } catch (error) {
        console.error('Lỗi khi đăng ký người dùng:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const signIn = async (req, res) => {
    try {
        // lấy input 
        const { email, password } = req.body;

        // Kiểm tra xem người dùng đã nhập đầy đủ thông tin chưa
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
        }

        // Tìm người dùng trong cơ sở dữ liệu
        const user = await User.findOne({ email });

        // Kiểm tra xem người dùng có tồn tại và mật khẩu có khớp không
        if (!user) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        // So sánh mật khẩu đã nhập với mật khẩu đã mã hóa trong cơ sở dữ liệu
        const passwordCorrect = await bcrypt.compare(password, user.password);

        if (!passwordCorrect) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        // Nếu khớp tạo accessToken 
        const accessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: ACCESS_TOKEN_TTL,
        });

        // Hàm tạo refreshToken ngẫu nhiên, không phải JWT
        const refreshToken = crypto.randomBytes(64).toString('hex');

        // Tạo Session để lưu refreshToken vào cơ sở dữ liệu 
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + parseInt(REFRESH_TOKEN_TTL))  // Thời gian hết hạn của refreshToken
        });

        // Trả refreshToken về trong cookies
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: parseInt(REFRESH_TOKEN_TTL)
        });

        // trả accessToken về trong res
        return res.status(200).json({ success: true, message: `Người dùng ${user.name} đăng nhập thành công`, accessToken });

    }
    catch (error) {
        console.error('Lỗi khi đăng nhập người dùng:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};