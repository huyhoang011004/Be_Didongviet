import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_ADMIN, // Email gửi đi (đã đăng ký mật khẩu ứng dụng trong Gmail)
        pass: process.env.GMAIL_APP_PASSWORD // Mật khẩu ứng dụng 16 ký tự
    }
});

export const sendOTPEmail = async (toEmail, otpCode) => {
    const recipients = [toEmail, process.env.GMAIL_ADMIN].filter(Boolean).join(', ');
    const mailOptions = {
        from: `"Di Động Việt Technology" <${process.env.GMAIL_ADMIN}>`,
        to: recipients,
        subject: `[Di Động Việt] Mã OTP Xác Thực Tài Khoản Của Bạn`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
                <h2 style="color: #0000ff; text-align: center;">XÁC THỰC TÀI KHOẢN</h2>
                <p>Chào bạn,</p>
                <p>Bạn vừa thực hiện thao tác đăng ký tài khoản tại hệ thống Di Động Việt. Mã OTP của bạn là:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #0000ff; letter-spacing: 5px; background: #f8f9fa; padding: 10px 20px; border-radius: 4px; border: 1px dashed #ccc;">
                        ${otpCode}
                    </span>
                </div>
                <p style="color: #555;">Mã OTP này có hiệu lực trong vòng <b>5 phút</b>. Vui lòng không cung cấp mã này cho bất kỳ ai.</p>
                <hr style="border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #999; text-align: center;">Mọi thắc mắc vui lòng liên hệ Hotline miễn phí: 1800.6018</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};