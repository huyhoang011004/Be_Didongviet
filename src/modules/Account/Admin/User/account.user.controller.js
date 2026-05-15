import Account from '#account/Account.model.js';
import StudentProfile from '#student/StudentProfile.model.js';

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
        const { name, phone, address } = req.body;

        // Tìm và cập nhật thông tin Account, trả về data mới sau khi update (.new = true)
        const updatedUser = await Account.findByIdAndUpdate(
            userId,
            {
                $set: {
                    name,
                    phone,
                    address
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

export { getUserProfile, updateUserProfile, deleteUserProfile };