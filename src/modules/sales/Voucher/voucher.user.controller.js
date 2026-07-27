import Voucher from '#voucher/Voucher.model.js';
import StudentProfile from '#studentProfile/StudentProfile.model.js';
import Order from '#order/Order.model.js';

export const getAllVouchers = async (req, res) => {
    try {
        const query = {
            isActive: true,
            expiryDate: { $gte: new Date() }
        };

        // Nếu client gửi query isHSSVOnly=true → chỉ lấy voucher HSSV
        if (req.query.isHSSVOnly === 'true') {
            query.isHSSVOnly = true;
        } else {
            // Mặc định: Kiểm tra user có phải HSSV đã xác thực không
            // Nếu KHÔNG phải HSSV → loại bỏ voucher chỉ dành cho HSSV
            let isHSSVVerified = false;

            if (req.user?._id) {
                const student = await StudentProfile.findOne({
                    userId: req.user._id,
                    isHSSVVerified: 'Đã xác thực'
                });
                isHSSVVerified = !!student;
            }

            // Chỉ hiển thị voucher HSSV nếu user đã xác thực HSSV
            // Nếu user chưa xác thực → ẩn voucher HSSV
            if (!isHSSVVerified) {
                query.isHSSVOnly = { $ne: true };
            }
        }

        // Additionally, filter out vouchers that have reached usage limit
        query.$expr = { $lt: ['$usedCount', '$usageLimit'] };

        const vouchers = await Voucher.find(query).sort({ startDate: 1 });

        // Tính userUsageCount cho mỗi voucher (nếu user đã đăng nhập)
        const userId = req.user?._id;
        const vouchersWithUsage = await Promise.all(vouchers.map(async (v) => {
            let userUsageCount = 0;
            if (userId) {
                userUsageCount = await Order.countDocuments({
                    user: userId,
                    appliedVoucher: v.code,
                    orderStatus: { $nin: ['Đã hủy'] }
                });
            }
            return {
                ...v.toObject(),
                userUsageCount,
                remainingUserUsage: Math.max(0, v.maxUsagePerUser - userUsageCount),
            };
        }));

        res.status(200).json({ success: true, data: vouchersWithUsage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getVoucherByCode = async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();

        const voucher = await Voucher.findOne({
            code,
            isActive: true,
            expiryDate: { $gte: new Date() }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher không tồn tại hoặc đã hết hạn' });
        }

        res.status(200).json({ success: true, data: voucher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
