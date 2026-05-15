import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Account from '#account/Account.model.js';
import sessionModel from '#auth/Session.model.js';
import { sendOTPEmail } from '#utils/emailService.js';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL;
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL;
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const login = async (req, res) => {
    try {
        // lấy input 
        const { email, password } = req.body;

        // Kiểm tra xem người dùng đã nhập đầy đủ thông tin chưa
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
        }

        // Kiểm tra xem người dùng có tồn tại và mật khẩu có khớp không
        const user = await Account.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }
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
        await sessionModel.create({
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
        let user = await Account.findOne({ email });

        // Tạo mật khẩu ngẫu nhiên
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        if (!user) {
            // Nếu chưa có, tạo tài khoản mới tự động
            user = new Account({
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
        await sessionModel.create({
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

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await Account.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng với email này' });
        }

        // Tạo OTP 6 chữ số và thời gian hết hạn 10 phút
        const otpCode = generateOTP();

        user.otpCode = otpCode;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP có hiệu lực 10 phút
        await user.save();

        // Gửi email xác nhận
        await sendOTPEmail(email, otpCode);

        res.status(200).json({
            success: true,
            message: 'Mã xác thực đổi mật khẩu đã được gửi đến email của bạn'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otpCode, newPassword } = req.body;

        // 1. Kiểm tra đầu vào
        if (!email || !otpCode || !newPassword) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới' });
        }

        // 2. Tìm user
        const user = await Account.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
        }

        // 3. Kiểm tra mã OTP và thời gian hết hạn
        if (user.otpCode !== otpCode || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'Mã xác thực không chính xác hoặc đã hết hạn' });
        }

        // 4. Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 5. Cập nhật mật khẩu và xóa dấu vết OTP
        user.password = hashedPassword;
        user.otpCode = undefined; // Xóa mã sau khi dùng xong
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Mật khẩu đã được thay đổi thành công. Bạn có thể đăng nhập ngay bây giờ.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};