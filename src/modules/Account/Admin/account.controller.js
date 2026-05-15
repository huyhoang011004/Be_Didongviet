import bcrypt from 'bcryptjs';
import Account from '#account/Account.model.js';
import StudentProfile from '#studentProfile/StudentProfile.model.js';
import Voucher from '#voucher/Voucher.model.js';
import Cart from '#cart/Cart.model.js';
import { sendOTPEmail } from '#utils/emailService.js';
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getAllUsersForAdmin = async (req, res) => {
    try {
        // 1. Lấy các tham số lọc từ query string (đặt cấu hình mặc định)
        const { status, page = 1, limit = 10, search } = req.query;

        // 2. Khởi tạo đối tượng điều kiện lọc (Filter Query)
        let filter = {};

        // 3. Xử lý logic lọc theo trạng thái xóa mềm (isDeleted)
        if (status === 'deleted') {
            // Chỉ lấy những người dùng đã bấm xóa mềm (đang trong 60 ngày chờ xóa cứng)
            filter.isDeleted = true;
        } else if (status === 'active') {
            // Chỉ lấy những người dùng đang hoạt động bình thường
            filter.isDeleted = false;
        } else {
            // Mặc định hoặc khi status === 'all': Lấy tất cả (cả xóa mềm lẫn hoạt động)
            // Không cần thêm điều kiện isDeleted vào filter
        }

        // 💡 Mẹo mở rộng: Thêm bộ lọc tìm kiếm theo Tên hoặc Email nếu Admin gõ ô tìm kiếm
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // 4. Tính toán số lượng bản ghi bỏ qua (Skip) phục vụ phân trang
        const skipIndex = (parseInt(page) - 1) * parseInt(limit);

        // 5. Thực thi truy vấn song song để lấy tổng số lượng và danh sách dữ liệu (Tối ưu performance)
        const [totalUsers, users] = await Promise.all([
            Account.countDocuments(filter),
            Account.find(filter)
                .select('-password') // Bảo mật: Không trả mật khẩu về frontend
                .sort({ createdAt: -1 }) // Sắp xếp người dùng mới đăng ký lên đầu
                .skip(skipIndex)
                .limit(parseInt(limit))
        ]);

        // 6. Trả kết quả về cho Frontend kèm thông tin phân trang chi tiết
        res.status(200).json({
            success: true,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            users
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createUserByAdmin = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        // Kiểm tra xem người dùng đã nhập đầy đủ thông tin chưa
        if (!name || !email || !password || !phone || !role) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
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
            role,
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
        res.status(400).json({ success: false, message: error.message });
    }
};


const updateUserByAdmin = async (req, res) => {
    try {
        const userId = req.params.id; // Lấy ID của user cần sửa từ URL params

        // Admin có quyền sửa nhiều trường hơn (bao gồm cả email, vai trò, trạng thái...)
        const { name, phone, email, address, role, isDeleted } = req.body;

        // Tìm và cập nhật thông tin Account theo ID chỉ định
        const updatedUser = await Account.findByIdAndUpdate(
            userId,
            {
                $set: {
                    name,
                    phone,
                    email,
                    address,
                    role,
                    isDeleted
                }
            },
            { new: true, runValidators: true } // Trả về data mới sau update và chạy validate dữ liệu
        ).select('-password'); // Bảo mật: Không trả về password

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng để cập nhật' });
        }

        res.status(200).json({
            success: true,
            message: `Admin đã cập nhật hồ sơ của người dùng [${updatedUser.name}] thành công.`,
            data: updatedUser
        });

    } catch (error) {
        // Bắt lỗi trùng lặp dữ liệu (E11000) nếu Admin sửa Email/Phone trùng với người khác đã có trong DB
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại hoặc Email này đã được sử dụng bởi một tài khoản khác trong hệ thống!'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteUserByAdmin = async (req, res) => {
    try {
        const userId = req.params.id; // Lấy ID cần xóa từ URL params

        // Thực hiện xóa cứng (Xóa vĩnh viễn khỏi Collection Accounts)
        const deletedUser = await Account.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại hoặc đã bị xóa cứng trước đó' });
        }

        // Dọn dẹp triệt để dữ liệu rác ở các bảng liên quan (Cascade delete bằng cơm)
        await Promise.all([
            StudentProfile.deleteOne({ userId }),
            Cart.deleteOne({ userId }),
            Voucher.updateMany({ assignedTo: userId }, { $set: { isActive: false } })
        ]);

        return res.status(200).json({
            success: true,
            message: `[Admin] Đã xóa cứng vĩnh viễn tài khoản của người dùng [${deletedUser.name}] và thanh trừng toàn bộ hồ sơ dữ liệu liên quan thành công.`
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export {
    getAllUsersForAdmin,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin
};