
import Voucher from '#voucher/Voucher.model.js';
import StudentProfile from '#studentProfile/StudentProfile.model.js';
import Order from '#order/Order.model.js';

export const calculateVoucherDiscount = async (voucherCode, currentSubTotal, userId) => {
    if (!voucherCode) return { discount: 0, reason: null };

    const voucher = await Voucher.findOne({
        code: voucherCode.toUpperCase(),
        isActive: true,
        expiryDate: { $gte: new Date() },
        startDate: { $lte: new Date() }
    });

    // Nếu voucher không tồn tại hoặc hết hạn, trả về giảm giá = 0
    if (!voucher || voucher.usedCount >= voucher.usageLimit) {
        return { discount: 0, reason: 'Mã đã hết hạn hoặc hết lượt' };
    }

    // Kiểm tra maxUsagePerUser: đếm số đơn hàng đã dùng mã này (không tính đơn đã hủy)
    const userUsageCount = await Order.countDocuments({
        user: userId,
        appliedVoucher: voucher.code,
        orderStatus: { $nin: ['Đã hủy'] }
    });
    if (userUsageCount >= voucher.maxUsagePerUser) {
        return { discount: 0, reason: `Bạn đã sử dụng mã này ${voucher.maxUsagePerUser} lần` };
    }

    // Check HSSV
    if (voucher.isHSSVOnly) {
        const student = await StudentProfile.findOne({ userId, isHSSVVerified: 'Đã xác thực' });
        if (!student) return { discount: 0, reason: 'Chỉ dành cho HSSV' };
    }

    let discount = 0;
    if (voucher.discountType === 'hssv_tiered') {
        const matchingTier = voucher.hssvTiers
            .sort((a, b) => b.minOrderValue - a.minOrderValue)
            .find(tier => currentSubTotal >= tier.minOrderValue);

        if (!matchingTier) return { discount: 0, reason: 'Chưa đạt giá trị đơn tối thiểu' };
        discount = matchingTier.discountAmount;
    } else {
        if (currentSubTotal < voucher.minOrderAmount) return { discount: 0, reason: 'Chưa đủ điều kiện đơn tối thiểu' };

        if (voucher.discountType === 'percentage') {
            discount = (currentSubTotal * voucher.discountValue) / 100;
            if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
        } else {
            discount = voucher.discountValue;
        }
    }

    return { discount: Math.min(discount, currentSubTotal), reason: null };
};