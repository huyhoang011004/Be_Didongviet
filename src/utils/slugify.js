// Chuyển đổi tên sản phẩm hoặc tiêu đề bài viết DChannel thành đường dẫn thân thiện với SEO (Ví dụ: "iPhone 17 Pro Max" thành "iphone-17-pro-max")
const slugify = (text) => {
    if (!text) return '';

    return text
        .toString()
        .trim()
        .toLowerCase()
        // 1. Thay thế thủ công chữ đ thành d (vì normalize không nhận chữ đ)
        .replace(/đ/g, 'd')
        // 2. Chuẩn hóa chuỗi để tách các dấu (á, à, ả...) ra khỏi chữ cái gốc
        .normalize('NFD')
        // 3. Xóa các ký tự dấu vừa được tách ra
        .replace(/[\u0300-\u036f]/g, '')
        // 4. Thay thế các ký tự không phải chữ cái, số, khoảng trắng hoặc dấu gạch ngang thành chuỗi rỗng
        .replace(/[^\w\s-]/g, '')
        // 5. Thay thế một hoặc nhiều khoảng trắng liên tiếp bằng một dấu gạch ngang
        .replace(/\s+/g, '-')
        // 6. Thay thế nhiều dấu gạch ngang liên tiếp thành một dấu duy nhất
        .replace(/--+/g, '-');
};

export default slugify;