import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';
import { sendOTPEmail } from '../config/mailer.js';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL;
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const signUp = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

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

        // Tạo mã OTP ngẫu nhiên gồm 6 chữ số
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút

        // Lưu user tạm thời vào database (chưa verified)
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            phone,
            otpCode,
            otpExpires
        });

        await newUser.save();

        // Gửi email chứa mã OTP
        await sendOTPEmail(email, otpCode);

        res.status(201).json({
            success: true,
            message: 'Đăng ký bước đầu thành công. Vui lòng kiểm tra Gmail để lấy mã OTP xác thực.'
        });

    } catch (error) {
        console.error('Lỗi khi đăng ký người dùng:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otpCode } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng.' });
        }

        // Kiểm tra OTP có đúng không
        if (user.otpCode !== otpCode) {
            return res.status(400).json({ success: false, message: 'Mã OTP không chính xác.' });
        }

        // Kiểm tra OTP còn hạn không
        if (user.otpExpires < new Date()) {
            return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã.' });
        }

        // Cập nhật trạng thái tài khoản kích hoạt thành công
        user.isVerified = true;
        user.otpCode = null; // Xóa mã cũ để bảo mật
        user.otpExpires = null;
        await user.save();

        res.status(200).json({ success: true, message: 'Xác thực tài khoản thành công! Bây giờ bạn đã có thể đăng nhập.' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xác thực OTP.', error: error.message });
    }
};



export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        // 1. Kiểm tra xem email có được gửi lên không
        if (!email) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email.' });
        }

        // 2. Tìm kiếm thông tin người dùng trong hệ thống
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng với email này.' });
        }

        // 3. Nếu tài khoản đã xác thực rồi thì không cần gửi lại OTP nữa
        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Tài khoản này đã được xác thực trước đó. Bạn có thể đăng nhập ngay.' });
        }

        // 4. Khởi tạo mã OTP mới và thiết lập thời gian hết hạn mới (5 phút)
        const newOtpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 phút tính từ hiện tại

        // 5. Cập nhật vào DB hồ sơ User
        user.otpCode = newOtpCode;
        user.otpExpires = otpExpires;
        await user.save();

        // 6. Gọi hàm gửi email 
        // Hệ thống sẽ tự động gửi cho cả User và GMAIL_ADMIN theo logic cũ
        await sendOTPEmail(user.email, newOtpCode);

        // 7. Trả phản hồi thành công về cho Frontend
        return res.status(200).json({
            success: true,
            message: 'Mã OTP mới đã được gửi thành công đến hộp thư của bạn và Admin hệ thống.'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ khi thực hiện gửi lại mã OTP.',
            error: error.message
        });
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
        if (user && user.isDeleted) {
            // Tự động khôi phục nếu họ đăng nhập lại trong vòng 60 ngày
            user.isDeleted = false;
            user.deletedAt = null;
            await user.save();
            // Tiếp tục cho đăng nhập...
        }

        // Chặn nếu tài khoản chưa qua bước xác thực OTP
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn chưa được kích hoạt qua OTP Gmail. Vui lòng xác thực trước.'
            });
        }

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
        const accessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
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


export const googleLoginController = async (req, res) => {
    try {
        const { email, name, googleId } = req.body;

        //  Kiểm tra xem user này đã tồn tại trong DB chưa
        let user = await User.findOne({ email });

        // Tạo mật khẩu ngẫu nhiên
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        if (!user) {
            // Nếu chưa có, tạo tài khoản mới tự động
            user = new User({
                name,
                email,
                password: hashedPassword,
                googleId,
                isVerified: true,
            });
            await user.save();
        } else {
            // Nếu đã có user cũ, bạn có thể cập nhật lại mã googleId nếu chưa có
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        }

        // Nếu khớp tạo accessToken 
        const accessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
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
        return res.status(200).json({ success: true, message: `Người dùng ${user.name} đăng nhập bằng Google thành công`, accessToken });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};