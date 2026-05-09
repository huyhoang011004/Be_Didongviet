// Chuyển đổi tên sản phẩm hoặc tiêu đề bài viết DChannel thành đường dẫn thân thiện với SEO (Ví dụ: "iPhone 17 Pro Max" thành "iphone-17-pro-max")
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Chuẩn hóa tiếng Việt
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
};

export default slugify;