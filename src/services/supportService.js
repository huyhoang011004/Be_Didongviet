import UserInquiry from '../models/UserInquiry.js';

const createInquiry = async (inquiryData) => {
    const { name, phone, product, message } = inquiryData;

    if (!name || !phone) throw new Error('Vui lòng cung cấp tên và số điện thoại');

    // Lưu thông tin để chuyên viên gọi lại tư vấn các dòng như iPhone 17 hay Galaxy S25 [5], [15]
    return await UserInquiry.create({ name, phone, product, message });
};

export { createInquiry };