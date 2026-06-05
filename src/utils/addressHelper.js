/**
 * Phân tách chuỗi địa chỉ thành mảng chứa một đối tượng địa chỉ có cấu trúc phù hợp với addressSchema.
 * 
 * Định dạng mong đợi từ frontend: "Số nhà/Đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành"
 * 
 * @param {string} addressStr Chuỗi địa chỉ gửi lên từ client
 * @returns {Array} Mảng chứa đối tượng địa chỉ có cấu trúc, hoặc mảng rỗng nếu chuỗi không hợp lệ
 */
export const parseAddressString = (addressStr) => {
    if (!addressStr || typeof addressStr !== 'string') {
        return [];
    }

    const trimmed = addressStr.trim();
    if (!trimmed) {
        return [];
    }

    // Tách chuỗi địa chỉ bằng dấu phẩy
    const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);

    let streetAddress = "Chưa cập nhật";
    let ward = "Chưa cập nhật";
    let district = "Chưa cập nhật";
    let province = "Chưa cập nhật";

    if (parts.length >= 4) {
        // Có từ 4 thành phần trở lên
        province = parts[parts.length - 1];
        district = parts[parts.length - 2];
        ward = parts[parts.length - 3];
        // Phần còn lại phía trước được gộp làm địa chỉ đường/số nhà
        streetAddress = parts.slice(0, parts.length - 3).join(', ');
    } else if (parts.length === 3) {
        // Có 3 thành phần
        province = parts[2];
        district = parts[1];
        streetAddress = parts[0];
    } else if (parts.length === 2) {
        // Có 2 thành phần
        province = parts[1];
        streetAddress = parts[0];
    } else if (parts.length === 1) {
        // Có 1 thành phần duy nhất
        streetAddress = parts[0];
    }

    return [{
        province,
        district,
        ward,
        streetAddress,
        isDefault: true
    }];
};
