const calculateFinalPrice = (product, user) => {
    let finalPrice = product.salePrice;

    // 1. Áp dụng ưu đãi Học sinh sinh viên (HSSV)
    // Giảm từ 200K (iPhone cũ) đến 600K hoặc 7% (Samsung/Tablet) [2], [9], [10]
    if (user.isHSSV && product.discountHSSV > 0) {
        // Nếu là giảm theo %, ví dụ 7% cho dòng Galaxy Tab S10 [9], [11]
        if (product.discountHSSV <= 100) {
            finalPrice -= (finalPrice * product.discountHSSV) / 100;
        } else {
            finalPrice -= product.discountHSSV;
        }
    }

    // 2. Áp dụng ưu đãi D.Member
    // Giảm thêm 1% cho thành viên của hệ thống [1], [3], [7]
    if (user.isDMember) {
        finalPrice -= (finalPrice * 1) / 100;
    }

    // 3. Trừ trợ giá Thu cũ đổi mới (Trade-in) nếu khách hàng tham gia
    // Trợ giá lên đến 5 triệu cho S26 Ultra hoặc 2.5 triệu cho iPhone 15 Plus [3], [6]
    if (product.tradeInBonus > 0) {
        // Lưu ý: Logic này thường được xử lý riêng khi xác nhận thu máy cũ
    }

    return finalPrice;
};

export { calculateFinalPrice };