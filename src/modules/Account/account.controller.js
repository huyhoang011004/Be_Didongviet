import Account from '#account/Account.model.js';
import StudentProfile from '#studentProfile/StudentProfile.model.js';
import { parseAddressString } from '#utils/addressHelper.js';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const getUserProfile = async (req, res) => {
    try {
        // Tìm thông tin Account cơ bản
        const user = await Account.findById(req.user._id)
            .populate('orderHistory')
            .select('-password'); // Bảo mật: không trả về password

        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        // Lấy kèm hồ sơ Học sinh - Sinh viên (nếu có)
        const studentProfile = await StudentProfile.findOne({ userId: user._id });

        res.status(200).json({
            success: true,
            data: {
                user,
                studentProfile: studentProfile || null // Nếu chưa đăng ký thì trả về null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user._id; // Hoặc dùng req.params.id nếu là Admin sửa hồ sơ
        const { name, phone, address, avatar } = req.body;

        let parsedAddress = address;
        if (typeof address === 'string') {
            parsedAddress = parseAddressString(address);
        }

        // Tìm và cập nhật thông tin Account, trả về data mới sau khi update (.new = true)
        const updatedUser = await Account.findByIdAndUpdate(
            userId,
            {
                $set: {
                    name,
                    phone,
                    address: parsedAddress,
                    avatar
                }
            },
            { new: true, runValidators: true }
        ).select('-password'); // Không trả về mật khẩu bảo mật

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật hồ sơ cá nhân thành công',
            data: updatedUser
        });
    } catch (error) {
        // Bắt lỗi trùng lặp dữ liệu (E11000) nếu số điện thoại hoặc email đã bị đăng ký trước đó
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại hoặc Email này đã được sử dụng bởi tài khoản khác!'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteUserProfile = async (req, res) => {

    try {
        const userId = req.user._id;

        // Kích hoạt bộ đếm ngược 60 ngày của TTL Index trong MongoDB bằng cách set isDeleted và deletedAt
        const softDeletedUser = await Account.findByIdAndUpdate(
            userId,
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date()
                }
            },
            { new: true }
        );

        if (!softDeletedUser) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
        }

        // Tạm thời đóng băng hồ sơ HSSV của họ (ẩn khỏi hệ thống)
        await StudentProfile.findOneAndUpdate({ userId }, { $set: { isHSSVVerified: 'Chưa xác thực' } });

        return res.status(200).json({
            success: true,
            message: 'Tài khoản của bạn đã được đóng và ẩn khỏi hệ thống. Bạn có 60 ngày để đăng nhập lại nếu muốn hủy yêu cầu xóa này.'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ mật khẩu cũ và mật khẩu mới' });
        }

        // Tìm tài khoản và lấy luôn cả password
        const user = await Account.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        // So sánh mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác' });
        }

        // Băm mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateAvatar = async (req, res) => {
    try {
        const userId = req.user._id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
        }

        // Build avatar URL from the uploaded file path
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        // Xóa avatar cũ nếu có
        const currentUser = await Account.findById(userId);
        if (currentUser && currentUser.avatar) {
            const oldAvatarPath = path.join(process.cwd(), currentUser.avatar.replace(/^\//, ''));
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }

        // Cập nhật avatar mới
        const updatedUser = await Account.findByIdAndUpdate(
            userId,
            { $set: { avatar: avatarUrl } },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật ảnh đại diện thành công',
            data: updatedUser
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { getUserProfile, updateUserProfile, deleteUserProfile, changePassword, updateAvatar };
