import sessionModel from '#auth/Session.model.js';
import { loginService, googleLoginService, forgotPasswordService, resetPasswordService } from './auth.service.js';

export const login = async (req, res) => {
    try {
        const result = await loginService(req.body);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: result.maxAge
        });
        return res.status(200).json({ 
            success: true, 
            message: `Người dùng ${result.user.name} đăng nhập thành công`, 
            accessToken: result.accessToken, 
            refreshToken: result.refreshToken 
        });
    } catch (error) {
        console.error('Lỗi khi đăng nhập người dùng:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const googleLoginController = async (req, res) => {
    try {
        const result = await googleLoginService(req.body);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: result.maxAge
        });
        return res.status(200).json({ 
            success: true, 
            message: `Người dùng ${result.user.name} đăng nhập bằng Google thành công`, 
            accessToken: result.accessToken, 
            refreshToken: result.refreshToken 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        await forgotPasswordService(req.body);
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
        await resetPasswordService(req.body);
        return res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (refreshToken) {
            await sessionModel.deleteOne({ refreshToken });
        }
        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none' });
        res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        const { refreshAccessTokenService } = await import('./auth.service.js');
        const result = await refreshAccessTokenService(refreshToken);
        res.status(200).json({ success: true, accessToken: result.accessToken });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

