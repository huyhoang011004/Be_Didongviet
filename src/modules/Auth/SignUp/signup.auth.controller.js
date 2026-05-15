import crypto from 'crypto';
import Account from '#account/Account.model.js';
import sessionModel from '#auth/Session.model.js';
import { sendOTPEmail } from '#utils/emailService.js';

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
        const userExists = await Account.findOne({ $or: [{ email }, { phone }] });

        if (userExists) {
            return res.status(409).json({ success: false, message: 'Email hoặc số điện thoại đã tồn tại' });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10); // Sử dụng bcrypt để mã hóa mật khẩu với salt rounds là 10

        // Tạo mã OTP ngẫu nhiên gồm 6 chữ số
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút

        // Lưu user tạm thời vào database (chưa verified)
        const newUser = new Account({
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

        const user = await Account.findOne({ email });
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
        const user = await Account.findOne({ email });
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