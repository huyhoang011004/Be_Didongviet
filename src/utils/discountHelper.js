/**
 * Tính toán giá sau khi áp dụng các mức giảm giá cho hệ thống Di Động Việt
 */
export const calculateDiscountedPrice = (originalPrice, options = {}) => {
    const {
        isHSSV = false,
        discountHSSV = 0,
        isDMember = false,
        dMemberDiscountRate = 1,
        tradeInBonus = 0
    } = options;

    let finalPrice = originalPrice;

    // 1. Giảm giá HSSV: Ưu tiên trừ trước
    if (isHSSV && discountHSSV > 0) {
        finalPrice -= (discountHSSV <= 100)
            ? (finalPrice * discountHSSV) / 100
            : discountHSSV;
    }

    // 2. Giảm giá D.Member: Tính trên giá sau khi đã giảm HSSV
    if (isDMember) {
        finalPrice -= (finalPrice * dMemberDiscountRate) / 100;
    }

    // 3. Trợ giá Thu cũ đổi mới
    finalPrice -= tradeInBonus;

    // Đảm bảo làm tròn số nguyên và không âm
    return Math.max(Math.round(finalPrice), 0);
};