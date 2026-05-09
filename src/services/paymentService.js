// Tích hợp Hướng dẫn thanh toán VNPAY và Trả góp 0% vào dịch vụ thanh toán
const getPaymentInstructions = (method) => {
    switch (method) {
        case 'VNPAY':
            return "Hệ thống sẽ chuyển hướng bạn đến cổng thanh toán VNPAY. Vui lòng quét mã QR để hoàn tất.";
        case 'Trả góp 0%':
            return "Chuyên viên sẽ liên hệ để hướng dẫn làm hồ sơ Trả góp 0% lãi suất qua thẻ tín dụng hoặc công ty tài chính.";
        default:
            return "Thanh toán bằng tiền mặt khi nhận hàng (COD).";
    }
};

export { getPaymentInstructions };