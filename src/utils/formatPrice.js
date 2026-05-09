/**
 * Định dạng số thành chuỗi tiền tệ VNĐ
 * Ví dụ: 8990000 -> 8.990.000 đ
 */
const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
};

export default formatPrice;