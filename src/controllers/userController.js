import User from '../models/User.js';

// 1. Lấy hồ sơ người dùng cá nhân
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('orderHistory');
        if (user) {
            res.json({
                success: true,
                data: user
            });
        } else {
            res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Người dùng tải ảnh thẻ HSSV lên để chờ duyệt
const uploadStudentCard = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ảnh thẻ HSSV' });
        }

        // Lưu đường dẫn ảnh và chuyển trạng thái sang pending
        user.studentCardImage = `/uploads/verify/${req.file.filename}`;
        user.isHSSVVerified = 'pending';

        await user.save();

        res.json({
            success: true,
            message: 'Đã tải ảnh minh chứng thành công. Vui lòng đợi hệ thống Di Động Việt xác nhận.',
            image: user.studentCardImage
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Admin lấy danh sách người dùng đang chờ duyệt HSSV
const getPendingHSSV = async (req, res) => {
    try {
        const pendingUsers = await User.find({ isHSSVVerified: 'pending' })
            .select('name email phone studentCardImage createdAt');
        res.json({ success: true, data: pendingUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Admin phê duyệt hoặc từ chối trạng thái HSSV
const verifyHSSVStatus = async (req, res) => {
    try {
        const { status, studentIdCard, schoolName, citizenId } = req.body;
        // citizenId: Số CCCD admin đọc từ ảnh thẻ (nếu có) hoặc yêu cầu user cung cấp

        const user = await User.findById(req.params.id);
        if (status === 'verified') {
            // Ưu tiên kiểm tra trùng lặp theo CCCD
            if (citizenId) {
                const duplicateCCCD = await User.findOne({ citizenId, _id: { $ne: user._id } });
                if (duplicateCCCD) {
                    return res.status(400).json({
                        success: false,
                        message: 'Số CCCD này đã được sử dụng cho một tài khoản khác!'
                    });
                }
                user.citizenId = citizenId;
            }

            // Kiểm tra trùng lặp theo MSSV + Trường (Cho những ai dùng MSSV)
            if (studentIdCard && schoolName) {
                const duplicateId = await User.findOne({
                    studentIdCard,
                    schoolName,
                    _id: { $ne: user._id }
                });
                if (duplicateId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Mã số này tại trường này đã tồn tại!'
                    });
                }
            }

            user.isHSSVVerified = 'verified';
            user.isHSSV = true;
            user.schoolName = schoolName;
            user.studentIdCard = studentIdCard || 'HS-GENERIC'; // Backup nếu không có mã
        } else {
            user.isHSSVVerified = 'rejected';
            user.isHSSV = false;
        }

        await user.save();
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export {
    getUserProfile,
    uploadStudentCard,
    getPendingHSSV,
    verifyHSSVStatus
};