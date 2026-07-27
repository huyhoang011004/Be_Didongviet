import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Account from '#account/Account.model.js';
import sessionModel from '#auth/Session.model.js';
import { sendOTPEmail } from '#utils/emailService.js';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '1d';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

const parseTTL = (ttl) => {
    if (!ttl) return 0;
    const value = parseInt(ttl);
    if (ttl.endsWith('d')) return value * 24 * 60 * 60 * 1000;
    if (ttl.endsWith('h')) return value * 60 * 60 * 1000;
    if (ttl.endsWith('m')) return value * 60 * 1000;
    if (ttl.endsWith('s')) return value * 1000;
    return value;
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const loginService = async ({ email, password }) => {
    const user = await Account.findOne({ email });
    if (!user) {
        throw new Error('Email hoặc mật khẩu không đúng');
    }
    if (user && user.isDeleted) {
        user.isDeleted = false;
        user.deletedAt = null;
        await user.save();
    }
    if (!user.isVerified) {
        throw new Error('Tài khoản của bạn chưa được kích hoạt qua OTP Gmail. Vui lòng xác thực trước.');
    }

    const passwordCorrect = await bcrypt.compare(password, user.password);
    if (!passwordCorrect) {
        throw new Error('Email hoặc mật khẩu không đúng');
    }

    const accessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_TTL,
    });
    const refreshToken = crypto.randomBytes(64).toString('hex');

    await sessionModel.create({
        userId: user._id,
        refreshToken,
        expiresAt: new Date(Date.now() + parseTTL(REFRESH_TOKEN_TTL))
    });

    return { user, accessToken, refreshToken, maxAge: parseTTL(REFRESH_TOKEN_TTL) };
};

export const googleLoginService = async ({ email, name, googleId }) => {
    let user = await Account.findOne({ email });
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    if (!user) {
        user = new Account({
            name,
            email,
            password: hashedPassword,
            googleId,
            isVerified: true,
        });
        await user.save();
    } else {
        if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }
    }

    const accessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_TTL,
    });
    const refreshToken = crypto.randomBytes(64).toString('hex');

    await sessionModel.create({
        userId: user._id,
        refreshToken,
        expiresAt: new Date(Date.now() + parseTTL(REFRESH_TOKEN_TTL))
    });

    return { user, accessToken, refreshToken, maxAge: parseTTL(REFRESH_TOKEN_TTL) };
};

export const forgotPasswordService = async ({ email }) => {
    const user = await Account.findOne({ email });
    if (!user) {
        throw new Error('Không tìm thấy người dùng với email này');
    }

    const otpCode = generateOTP();
    user.otpCode = otpCode;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP có hiệu lực 10 phút
    await user.save();

    await sendOTPEmail(email, otpCode);
    return true;
};

export const resetPasswordService = async ({ email, otpCode, newPassword }) => {
    const user = await Account.findOne({ email });
    if (!user) {
        throw new Error('Người dùng không tồn tại');
    }
    if (user.otpCode !== otpCode) {
        throw new Error('Mã OTP không đúng');
    }
    if (user.otpExpires < Date.now()) {
        throw new Error('Mã OTP đã hết hạn');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();
    return true;
};

export const refreshAccessTokenService = async (refreshToken) => {
    if (!refreshToken) throw new Error('Không có refresh token');
    const session = await sessionModel.findOne({ refreshToken }).populate('userId');
    if (!session || session.expiresAt < Date.now()) throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
    const user = session.userId;
    const newAccessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    return { accessToken: newAccessToken };
};

