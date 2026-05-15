/**
 * Tính toán giá sau khi áp dụng các mức giảm giá cho hệ thống Di Động Việt
 */
export const calculateDiscountedPrice = (originalPrice, options = {}) => {
    const {
        isDMember = false,
        dMemberDiscountRate = 1,
        tradeInBonus = 0
    } = options;

    let finalPrice = originalPrice;

    // 2. Giảm giá D.Member: 
    if (isDMember) {
        finalPrice -= (finalPrice * dMemberDiscountRate) / 100;
    }

    // 3. Trợ giá Thu cũ đổi mới
    finalPrice -= tradeInBonus;

    // Đảm bảo làm tròn số nguyên và không âm
    return Math.max(Math.round(finalPrice), 0);
};