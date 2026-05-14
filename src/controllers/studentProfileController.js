import StudentProfile from '../models/StudentProfile.js'; // Thay đổi đường dẫn tùy cấu trúc của bạn
import Voucher from '../models/Voucher.js';

// @desc    Cập nhật hoặc tạo mới thông tin chữ hồ sơ HSSV (Text data)
// @route   POST /api/student-profile/update
// @access  Private (HSSV/User)
const updateStudentProfile = async (req, res) => {
    try {
        const userId = req.user._id; // Lấy ID từ Token xác thực thông qua Middleware auth
        const { studentIdCard, schoolName } = req.body;
        const studentCardImage = req.body.studentCardImage;

        // Tìm xem đã có hồ sơ sinh viên chưa
        let profile = await StudentProfile.findOne({ userId });

        if (profile) {
            // Nếu đã có, tiến hành cập nhật dữ liệu mới và reset trạng thái duyệt
            profile.studentIdCard = studentIdCard || profile.studentIdCard;
            profile.schoolName = schoolName || profile.schoolName;
            if (studentCardImage) profile.studentCardImage = studentCardImage;
            profile.isHSSVVerified = 'Đang chờ'; // Gửi lại yêu cầu xác thực mới

            await profile.save();
        } else {
            // Nếu chưa có, tạo mới hoàn toàn hồ sơ HSSV
            profile = await StudentProfile.create({
                userId,
                studentIdCard,
                schoolName,
                studentCardImage,
                isHSSVVerified: 'Đang chờ'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin hồ sơ HSSV thành công, vui lòng chờ duyệt',
            data: profile
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Người dùng tải ảnh minh chứng HSSV lên (Dùng Multer xử lý file)
// @route   POST /api/student-profile/upload-card
// @access  Private (HSSV/User)
const uploadStudentCard = async (req, res) => {
    try {
        const userId = req.user._id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ảnh thẻ HSSV làm minh chứng' });
        }

        const studentCardImage = `/uploads/verify/${req.file.filename}`;

        // Kiểm tra xem user này đã từng tạo hồ sơ HSSV chưa
        let profile = await StudentProfile.findOne({ userId });

        if (profile) {
            // Nếu hồ sơ cũ đang chờ duyệt hoặc đã duyệt thành công thì không cho gửi trùng lặp
            if (profile.isHSSVVerified === 'Đã xác thực') {
                return res.status(400).json({ success: false, message: 'Tài khoản của bạn đã được xác thực HSSV rồi!' });
            }
            if (profile.isHSSVVerified === 'Đang chờ') {
                return res.status(400).json({ success: false, message: 'Hồ sơ trước đó đang trong hàng đợi phê duyệt, vui lòng không gửi lại!' });
            }

            // Nếu hồ sơ cũ 'Bị từ chối' hoặc 'Chưa xác thực', cho phép cập nhật lại ảnh mới để gửi duyệt lại
            profile.studentCardImage = studentCardImage;
            profile.isHSSVVerified = 'Đang chờ';
            await profile.save();
        } else {
            // Nếu chưa từng có bản ghi, tiến hành tạo mới
            profile = await StudentProfile.create({
                userId,
                studentCardImage,
                isHSSVVerified: 'Đang chờ',
                studentIdCard: 'PENDING_ID', // Tạm thời điền dữ liệu giả, Admin sẽ điền chuẩn khi duyệt
                schoolName: 'PENDING_SCHOOL'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Đã tải ảnh minh chứng thành công. Vui lòng đợi Ban quản trị Di Động Việt xác nhận.',
            data: profile
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Admin lấy danh sách hồ sơ đang chờ duyệt HSSV
// @route   GET /api/student-profile/pending
// @access  Private (Admin Only)
const getPendingHSSV = async (req, res) => {
    try {
        const pendingProfiles = await StudentProfile.find({ isHSSVVerified: 'Đang chờ' })
            .populate('userId', 'name email phone') // Lấy tên, email, sđt từ bảng User sang
            .sort({ createdAt: 1 }); // Hồ sơ gửi trước duyệt trước

        res.status(200).json({ success: true, data: pendingProfiles });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Admin phê duyệt hoặc từ chối trạng thái HSSV
// @route   PUT /api/student-profile/verify/:id
// @access  Private (Admin Only)
const verifyHSSVStatus = async (req, res) => {
    try {
        const { status, studentIdCard, schoolName, citizenId, rejectedReason } = req.body;
        const profileId = req.params.id; // ID của StudentProfile cần duyệt

        // Tìm hồ sơ HSSV cần xử lý
        const profile = await StudentProfile.findById(profileId);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ HSSV này!' });
        }

        if (status === 'Đã xác thực') {
            if (!schoolName || !studentIdCard) {
                return res.status(400).json({ success: false, message: 'Cần bổ sung Tên trường và MSSV khi phê duyệt thành công!' });
            }

            // A. Kiểm tra trùng lặp CCCD toàn hệ thống
            if (citizenId) {
                const duplicateCCCD = await StudentProfile.findOne({
                    citizenId,
                    _id: { $ne: profile._id }
                });
                if (duplicateCCCD) {
                    return res.status(400).json({ success: false, message: 'Số CCCD này đã được sử dụng để xác thực cho một tài khoản khác!' });
                }
                profile.citizenId = citizenId;
            }

            // B. Kiểm tra trùng lặp combo (Mã số sinh viên + Tên trường)
            const duplicateStudentId = await StudentProfile.findOne({
                studentIdCard,
                schoolName,
                _id: { $ne: profile._id }
            });
            if (duplicateStudentId) {
                return res.status(400).json({ success: false, message: 'Mã số sinh viên tại trường đại học này đã tồn tại trên hệ thống!' });
            }

            // C. Cập nhật hồ sơ HSSV thành công
            profile.isHSSVVerified = 'Đã xác thực';
            profile.schoolName = schoolName;
            profile.studentIdCard = studentIdCard;
            profile.rejectedReason = undefined;
            await profile.save();

            // D. Kiểm tra mã voucher đặc quyền HSSV đa tầng đang kích hoạt
            const hssvVoucher = await Voucher.findOne({ isHSSVOnly: true, isActive: true });

            let voucherNotification = 'Tài khoản của bạn đã mở khóa đặc quyền HSSV.';
            if (hssvVoucher) {
                voucherNotification = `Xác thực thành công! Hãy nhập mã voucher độc quyền: [ ${hssvVoucher.code} ] tại giỏ hàng để được giảm từ 200k - 600k tùy theo giá trị đơn hàng mua sắm tại Di Động Việt!`;
            }

            return res.status(200).json({
                success: true,
                message: 'Phê duyệt hồ sơ HSSV thành công!',
                voucherCode: hssvVoucher ? hssvVoucher.code : null,
                instruction: voucherNotification
            });

        } else if (status === 'Bị từ chối') {
            // Từ chối hồ sơ (Do ảnh mờ, sai thông tin...)
            profile.isHSSVVerified = 'Bị từ chối';
            profile.rejectedReason = rejectedReason || 'Hình ảnh minh chứng không rõ ràng hoặc không hợp lệ.';
            await profile.save();

            return res.status(200).json({ success: true, message: 'Đã từ chối hồ sơ và gửi lý do cho khách hàng.' });
        } else {
            return res.status(400).json({ success: false, message: 'Trạng thái phê duyệt (status) không hợp lệ.' });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Export toàn bộ các hàm
export {
    updateStudentProfile,
    uploadStudentCard,
    getPendingHSSV,
    verifyHSSVStatus
};