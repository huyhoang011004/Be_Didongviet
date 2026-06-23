// ============================================================
// SCRIPT SEED DATA - DI ĐỘNG VIỆT
// ============================================================
// Chạy lệnh: node scripts/seed.js
// (hoặc: npm run seed nếu đã cấu hình trong package.json)
//
// Script này sẽ:
// 1. Xóa toàn bộ dữ liệu cũ trong các collection
// 2. Tạo dữ liệu mẫu: Admin, Categories, Products, Branches, Vouchers, Blogs
// ============================================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// ======================== IMPORTS ========================
import Account from '../src/modules/Account/Account.model.js';
import Category from '../src/modules/Category/Category.model.js';
import Product from '../src/modules/Product/Product.model.js';
import Branch from '../src/modules/Branch/Branch.model.js';
import Voucher from '../src/modules/Voucher/Voucher.model.js';
import Blog from '../src/modules/Blog/Blog.model.js';

// ======================== KẾT NỐI DB ========================
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017/didongviet');
        console.log(`✅ Đã kết nối MongoDB: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// ======================== DỮ LIỆU MẪU ========================

// --- ACCOUNTS ---
const accountsData = [
    {
        name: 'Admin Di Động Việt',
        email: 'admin@didongviet.vn',
        password: 'Admin@123',
        phone: '0901234567',
        role: 'admin',
        isVerified: true,
        membershipLevel: 'Kim cương',
        address: [
            {
                province: 'Hồ Chí Minh',
                district: 'Quận 1',
                ward: 'Phường Bến Nghé',
                streetAddress: '12 Nguyễn Huệ',
                isDefault: true,
            },
        ],
    },
    {
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@email.com',
        password: 'User@123',
        phone: '0912345678',
        role: 'user',
        isVerified: true,
        membershipLevel: 'Vàng',
        address: [
            {
                province: 'Hồ Chí Minh',
                district: 'Quận 3',
                ward: 'Phường 4',
                streetAddress: '123 Lê Văn Sỹ',
                isDefault: true,
            },
        ],
    },
    {
        name: 'Trần Thị B',
        email: 'tranthib@email.com',
        password: 'User@123',
        phone: '0923456789',
        role: 'user',
        isVerified: true,
        membershipLevel: 'Tiêu chuẩn',
        address: [
            {
                province: 'Hà Nội',
                district: 'Cầu Giấy',
                ward: 'Phường Dịch Vọng',
                streetAddress: '45 Trần Duy Hưng',
                isDefault: true,
            },
        ],
    },
];

// --- CATEGORIES ---
const categoriesData = [
    {
        name: 'Điện thoại thông minh',
        slug: 'dien-thoai-thong-minh',
        image: '/uploads/categories/dien-thoai.png',
        displayOrder: 1,
        isActive: true,
    },
    {
        name: 'Laptop',
        slug: 'laptop',
        image: '/uploads/categories/laptop.png',
        displayOrder: 2,
        isActive: true,
    },
    {
        name: 'Tablet',
        slug: 'tablet',
        image: '/uploads/categories/tablet.png',
        displayOrder: 3,
        isActive: true,
    },
    {
        name: 'Đồng hồ thông minh',
        slug: 'dong-ho-thong-minh',
        image: '/uploads/categories/dong-ho.png',
        displayOrder: 4,
        isActive: true,
    },
    {
        name: 'Phụ kiện',
        slug: 'phu-kien',
        image: '/uploads/categories/phu-kien.png',
        displayOrder: 5,
        isActive: true,
    },
    {
        name: 'Máy cũ - Like New',
        slug: 'may-cu-like-new',
        image: '/uploads/categories/may-cu.png',
        displayOrder: 6,
        isActive: true,
    },
];

// --- PRODUCTS ---
const productsData = [
    {
        name: 'iPhone 16 Pro Max',
        brand: 'Apple',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>iPhone 16 Pro Max — Đẳng cấp mới</h3>
<p>Chip A18 Pro mạnh mẽ, màn hình Super Retina XDR 6.9 inch, camera 48MP với khả năng quay video ProRes.</p>
<ul>
<li>Chip: A18 Pro (3nm)</li>
<li>RAM: 8GB</li>
<li>Pin: 4685mAh</li>
<li>Sạc: USB-C 40W, MagSafe 25W</li>
</ul>`,
        images: [
            { url: '/uploads/products/iphone-16-pro-max-1.png', isThumbnail: true, alt: 'iPhone 16 Pro Max - Xám' },
            { url: '/uploads/products/iphone-16-pro-max-2.png', isThumbnail: false, alt: 'iPhone 16 Pro Max - Vàng' },
        ],
        variants: [
            { color: 'Titan Xám', ram: '8GB', rom: '256GB', price: 34990000, salePrice: 32990000 },
            { color: 'Titan Xám', ram: '8GB', rom: '512GB', price: 39990000, salePrice: 37990000 },
            { color: 'Titan Xám', ram: '8GB', rom: '1TB', price: 45990000, salePrice: 43990000 },
            { color: 'Titan Vàng', ram: '8GB', rom: '256GB', price: 34990000, salePrice: 32990000 },
            { color: 'Titan Vàng', ram: '8GB', rom: '512GB', price: 39990000, salePrice: 37990000 },
        ],
        discountDMember: 2,
        tradeInBonus: 2000000,
        ratingsAverage: 4.8,
        ratingsCount: 1256,
        isActive: true,
    },
    {
        name: 'Samsung Galaxy S25 Ultra',
        brand: 'Samsung',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>Samsung Galaxy S25 Ultra — AI mạnh mẽ</h3>
<p>Galaxy AI tích hợp, bút S-Pen, camera 200MP zoom không gian 100x.</p>
<ul>
<li>Chip: Snapdragon 8 Gen 4 (3nm)</li>
<li>RAM: 12GB</li>
<li>Pin: 5000mAh</li>
<li>Sạc: USB-C 45W, sạc không dây 15W</li>
</ul>`,
        images: [
            { url: '/uploads/products/samsung-s25-ultra-1.png', isThumbnail: true, alt: 'Samsung Galaxy S25 Ultra - Bạc' },
            { url: '/uploads/products/samsung-s25-ultra-2.png', isThumbnail: false, alt: 'Samsung Galaxy S25 Ultra - Đen' },
        ],
        variants: [
            { color: 'Bạc Titanium', ram: '12GB', rom: '256GB', price: 32990000, salePrice: 30990000 },
            { color: 'Bạc Titanium', ram: '12GB', rom: '512GB', price: 36990000, salePrice: 34990000 },
            { color: 'Bạc Titanium', ram: '12GB', rom: '1TB', price: 42990000, salePrice: 40990000 },
            { color: 'Đen Titanium', ram: '12GB', rom: '256GB', price: 32990000, salePrice: 30990000 },
            { color: 'Đen Titanium', ram: '12GB', rom: '512GB', price: 36990000, salePrice: 34990000 },
        ],
        discountDMember: 2,
        tradeInBonus: 1500000,
        ratingsAverage: 4.7,
        ratingsCount: 892,
        isActive: true,
    },
    {
        name: 'OPPO Find X8 Pro',
        brand: 'OPPO',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>OPPO Find X8 Pro — Chuyên gia nhiếp ảnh</h3>
<p>Camera Hasselblad, chip Dimensity 9400, sạc siêu tốc 100W.</p>
<ul>
<li>Chip: MediaTek Dimensity 9400 (3nm)</li>
<li>RAM: 12GB</li>
<li>Pin: 5000mAh</li>
<li>Sạc: SUPERVOOC 100W, sạc không dây 50W</li>
</ul>`,
        images: [
            { url: '/uploads/products/oppo-find-x8-pro-1.png', isThumbnail: true, alt: 'OPPO Find X8 Pro - Xanh' },
        ],
        variants: [
            { color: 'Xanh Ocean', ram: '12GB', rom: '256GB', price: 24990000, salePrice: 22990000 },
            { color: 'Xanh Ocean', ram: '12GB', rom: '512GB', price: 27990000, salePrice: 25990000 },
            { color: 'Đen Starlight', ram: '12GB', rom: '256GB', price: 24990000, salePrice: 22990000 },
        ],
        discountDMember: 3,
        tradeInBonus: 1000000,
        ratingsAverage: 4.6,
        ratingsCount: 345,
        isActive: true,
    },
    {
        name: 'Xiaomi 15 Pro',
        brand: 'Xiaomi',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>Xiaomi 15 Pro — Flagship giá tốt</h3>
<p>Snapdragon 8 Gen 4, camera Leica, pin 5400mAh sạc 120W.</p>
<ul>
<li>Chip: Snapdragon 8 Gen 4 (3nm)</li>
<li>RAM: 12GB</li>
<li>Pin: 5400mAh</li>
<li>Sạc: HyperCharge 120W, sạc không dây 50W</li>
</ul>`,
        images: [
            { url: '/uploads/products/xiaomi-15-pro-1.png', isThumbnail: true, alt: 'Xiaomi 15 Pro - Trắng' },
        ],
        variants: [
            { color: 'Trắng Ceramic', ram: '12GB', rom: '256GB', price: 21990000, salePrice: 19990000 },
            { color: 'Trắng Ceramic', ram: '12GB', rom: '512GB', price: 24990000, salePrice: 22990000 },
            { color: 'Đen Ceramic', ram: '12GB', rom: '256GB', price: 21990000, salePrice: 19990000 },
            { color: 'Đen Ceramic', ram: '16GB', rom: '512GB', price: 26990000, salePrice: 24990000 },
        ],
        discountDMember: 3,
        tradeInBonus: 1000000,
        ratingsAverage: 4.5,
        ratingsCount: 567,
        isActive: true,
    },
    {
        name: 'iPhone 16 Pro',
        brand: 'Apple',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>iPhone 16 Pro — Mạnh mẽ, tinh tế</h3>
<p>Màn hình 6.3 inch, chip A18 Pro, camera 48MP.</p>
<ul>
<li>Chip: A18 Pro (3nm)</li>
<li>RAM: 8GB</li>
<li>Pin: 3582mAh</li>
<li>Sạc: USB-C 40W, MagSafe 25W</li>
</ul>`,
        images: [
            { url: '/uploads/products/iphone-16-pro-1.png', isThumbnail: true, alt: 'iPhone 16 Pro - Tự nhiên' },
        ],
        variants: [
            { color: 'Titan Tự nhiên', ram: '8GB', rom: '128GB', price: 28990000, salePrice: 26990000 },
            { color: 'Titan Tự nhiên', ram: '8GB', rom: '256GB', price: 31990000, salePrice: 29990000 },
            { color: 'Titan Tự nhiên', ram: '8GB', rom: '512GB', price: 37990000, salePrice: 35990000 },
            { color: 'Titan Xanh', ram: '8GB', rom: '256GB', price: 31990000, salePrice: 29990000 },
        ],
        discountDMember: 2,
        tradeInBonus: 1500000,
        ratingsAverage: 4.7,
        ratingsCount: 2341,
        isActive: true,
    },
    {
        name: 'Samsung Galaxy Z Fold 6',
        brand: 'Samsung',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>Galaxy Z Fold 6 — Gập mở đột phá</h3>
<p>Màn hình gập 7.6 inch, bút S-Pen tích hợp, chip Snapdragon 8 Gen 3.</p>
<ul>
<li>Chip: Snapdragon 8 Gen 3 (4nm)</li>
<li>RAM: 12GB</li>
<li>Pin: 4400mAh</li>
<li>Sạc: USB-C 25W, sạc không dây 15W</li>
</ul>`,
        images: [
            { url: '/uploads/products/samsung-z-fold-6-1.png', isThumbnail: true, alt: 'Samsung Z Fold 6 - Xám' },
        ],
        variants: [
            { color: 'Xám Navy', ram: '12GB', rom: '256GB', price: 41990000, salePrice: 39990000 },
            { color: 'Xám Navy', ram: '12GB', rom: '512GB', price: 45990000, salePrice: 43990000 },
            { color: 'Trắng', ram: '12GB', rom: '256GB', price: 41990000, salePrice: 39990000 },
        ],
        discountDMember: 2,
        tradeInBonus: 2000000,
        ratingsAverage: 4.6,
        ratingsCount: 234,
        isActive: true,
    },
    {
        name: 'Laptop Apple MacBook Pro 14" M4',
        brand: 'Apple',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>MacBook Pro 14" M4 — Sức mạnh Pro</h3>
<p>Chip M4 Pro, màn hình Liquid Retina XDR 14.2 inch, pin 18 giờ.</p>
<ul>
<li>Chip: Apple M4 Pro (3nm)</li>
<li>RAM: 18GB Unified</li>
<li>Ổ cứng: 512GB SSD</li>
<li>Màn hình: 14.2" Liquid Retina XDR</li>
</ul>`,
        images: [
            { url: '/uploads/products/macbook-pro-14-m4-1.png', isThumbnail: true, alt: 'MacBook Pro 14 M4 - Bạc' },
        ],
        variants: [
            { color: 'Bạc', ram: '18GB', rom: '512GB', price: 45990000, salePrice: 43990000 },
            { color: 'Bạc', ram: '18GB', rom: '1TB', price: 51990000, salePrice: 49990000 },
            { color: 'Xám không gian', ram: '18GB', rom: '512GB', price: 45990000, salePrice: 43990000 },
        ],
        discountDMember: 1,
        tradeInBonus: 2000000,
        ratingsAverage: 4.9,
        ratingsCount: 456,
        isActive: true,
    },
    {
        name: 'iPad Pro M4 11 inch',
        brand: 'Apple',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>iPad Pro M4 — Mỏng nhẹ đột phá</h3>
<p>Màn hình Ultra Retina XDR 11 inch, chip M4, hỗ trợ Apple Pencil Pro.</p>
<ul>
<li>Chip: Apple M4 (3nm)</li>
<li>RAM: 8GB</li>
<li>Ổ cứng: 256GB SSD</li>
<li>Màn hình: 11" Ultra Retina XDR</li>
</ul>`,
        images: [
            { url: '/uploads/products/ipad-pro-m4-1.png', isThumbnail: true, alt: 'iPad Pro M4 - Bạc' },
        ],
        variants: [
            { color: 'Bạc', ram: '8GB', rom: '256GB', price: 27990000, salePrice: 25990000, wifi: 'Wi-Fi' },
            { color: 'Bạc', ram: '8GB', rom: '512GB', price: 32990000, salePrice: 30990000, wifi: 'Wi-Fi' },
            { color: 'Xám không gian', ram: '8GB', rom: '256GB', price: 27990000, salePrice: 25990000, wifi: 'Wi-Fi + Cellular' },
        ],
        discountDMember: 2,
        tradeInBonus: 1000000,
        ratingsAverage: 4.8,
        ratingsCount: 345,
        isActive: true,
    },
    {
        name: 'Apple Watch Ultra 2',
        brand: 'Apple',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>Apple Watch Ultra 2 — Bền bỉ, thể thao</h3>
<p>Màn hình 49mm, chip S9, GPS + Cellular, khả năng lặn 100m.</p>
<ul>
<li>Chip: Apple S9</li>
<li>Màn hình: 49mm Always-On Retina</li>
<li>Pin: 36 giờ</li>
<li>Kháng nước: 100m (WR100)</li>
</ul>`,
        images: [
            { url: '/uploads/products/watch-ultra-2-1.png', isThumbnail: true, alt: 'Apple Watch Ultra 2' },
        ],
        variants: [
            { color: 'Titanium', ram: 'N/A', rom: '64GB', price: 21990000, salePrice: 20990000 },
        ],
        discountDMember: 1,
        tradeInBonus: 0,
        ratingsAverage: 4.7,
        ratingsCount: 189,
        isActive: true,
    },
    {
        name: 'Samsung Galaxy Watch 7 Ultra',
        brand: 'Samsung',
        condition: 'Mới',
        warrantyPeriod: '12 tháng',
        description: `<h3>Galaxy Watch 7 Ultra — Sức mạnh AI</h3>
<p>Màn hình 47mm, chip Exynos W1000, Galaxy AI, kháng nước IP68.</p>
<ul>
<li>Chip: Exynos W1000 (3nm)</li>
<li>Màn hình: 47mm Super AMOLED</li>
<li>Pin: 590mAh (60 giờ)</li>
<li>Kháng nước: 5ATM + IP68</li>
</ul>`,
        images: [
            { url: '/uploads/products/galaxy-watch-7-ultra-1.png', isThumbnail: true, alt: 'Samsung Galaxy Watch 7 Ultra' },
        ],
        variants: [
            { color: 'Bạc Titanium', ram: '2GB', rom: '32GB', price: 12990000, salePrice: 11990000 },
            { color: 'Đen Titanium', ram: '2GB', rom: '32GB', price: 12990000, salePrice: 11990000 },
        ],
        discountDMember: 2,
        tradeInBonus: 0,
        ratingsAverage: 4.5,
        ratingsCount: 123,
        isActive: true,
    },
];

// --- BRANCHES ---
const branchesData = [
    {
        name: 'Di Động Việt — Quận 1',
        address: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, Hồ Chí Minh',
        phone: '028 3823 4567',
        email: 'q1@didongviet.vn',
        workingHours: '08:00 - 21:30',
        isActive: true,
    },
    {
        name: 'Di Động Việt — Quận 3',
        address: '456 Lê Văn Sỹ, Phường 4, Quận 3, Hồ Chí Minh',
        phone: '028 3932 5678',
        email: 'q3@didongviet.vn',
        workingHours: '08:00 - 21:30',
        isActive: true,
    },
    {
        name: 'Di Động Việt — Hà Nội',
        address: '123 Trần Duy Hưng, Phường Trung Hòa, Cầu Giấy, Hà Nội',
        phone: '024 6282 3456',
        email: 'hanoi@didongviet.vn',
        workingHours: '08:00 - 21:30',
        isActive: true,
    },
    {
        name: 'Di Động Việt — Đà Nẵng',
        address: '78 Nguyễn Văn Linh, Phường Bình Thuận, Quận Hải Châu, Đà Nẵng',
        phone: '0236 3822 345',
        email: 'danang@didongviet.vn',
        workingHours: '08:00 - 21:00',
        isActive: true,
    },
    {
        name: 'Di Động Việt — Cần Thơ',
        address: '56 Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, Cần Thơ',
        phone: '0292 3722 456',
        email: 'cantho@didongviet.vn',
        workingHours: '08:00 - 21:00',
        isActive: true,
    },
    {
        name: 'Di Động Việt — Hải Phòng',
        address: '90 Lạch Tray, Phường Lạch Tray, Quận Ngô Quyền, Hải Phòng',
        phone: '0225 3822 567',
        email: 'haiphong@didongviet.vn',
        workingHours: '08:00 - 21:00',
        isActive: true,
    },
];

// --- VOUCHERS ---
const vouchersData = [
    {
        code: 'DIDONGVIET50',
        name: 'Giảm 50K cho đơn từ 500K',
        type: 'fixed',
        value: 50000,
        minOrderValue: 500000,
        maxDiscount: 50000,
        usageLimit: 1000,
        usedCount: 0,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
    },
    {
        code: 'DIDONGVIET100',
        name: 'Giảm 100K cho đơn từ 1 triệu',
        type: 'fixed',
        value: 100000,
        minOrderValue: 1000000,
        maxDiscount: 100000,
        usageLimit: 500,
        usedCount: 0,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
    },
    {
        code: 'WELCOME10',
        name: 'Giảm 10% cho khách hàng mới (tối đa 200K)',
        type: 'percentage',
        value: 10,
        minOrderValue: 0,
        maxDiscount: 200000,
        usageLimit: 2000,
        usedCount: 0,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
    },
    {
        code: 'FlashSale20',
        name: 'Flash Sale — Giảm 20% (tối đa 500K)',
        type: 'percentage',
        value: 20,
        minOrderValue: 1000000,
        maxDiscount: 500000,
        usageLimit: 200,
        usedCount: 0,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-08-31'),
        isActive: true,
    },
];

// --- BLOGS ---
const blogsData = [
    {
        title: 'Top 5 điện thoại đáng mua nhất năm 2026',
        slug: 'top-5-dien-thoai-dang-mua-nhat-2026',
        content: `<h2>Top 5 điện thoại đáng mua nhất năm 2026</h2>
<p>Thị trường smartphone năm 2026 chứng kiến nhiều đột phá công nghệ. Dưới đây là 5 sản phẩm đáng chú ý nhất.</p>

<h3>1. iPhone 16 Pro Max</h3>
<p>Flagship đến từ Apple với chip A18 Pro, camera 48MP và thời lượng pin ấn tượng. Giá từ 32.990.000₫.</p>

<h3>2. Samsung Galaxy S25 Ultra</h3>
<p>Galaxy AI thông minh, camera 200MP và bút S-Pen. Giá từ 30.990.000₫.</p>

<h3>3. OPPO Find X8 Pro</h3>
<p>Camera Hasselblad chuyên nghiệp, sạc siêu tốc 100W. Giá từ 22.990.000₫.</p>

<h3>4. Xiaomi 15 Pro</h3>
<p>Snapdragon 8 Gen 4, pin 5400mAh, sạc 120W. Giá chỉ từ 19.990.000₫.</p>

<h3>5. Samsung Galaxy Z Fold 6</h3>
<p>Điện thoại gập cao cấp với màn hình 7.6 inch. Giá từ 39.990.000₫.</p>

<p>Hãy ghé Di Động Việt để trải nghiệm trực tiếp các sản phẩm này nhé!</p>`,
        author: null, // Sẽ gán author là admin
        tags: ['Điện thoại', 'Đánh giá', 'Công nghệ'],
        image: '/uploads/blogs/top-5-dien-thoai-2026.png',
        isActive: true,
    },
    {
        title: 'So sánh Apple Watch Ultra 2 vs Samsung Galaxy Watch 7 Ultra',
        slug: 'so-sanh-apple-watch-ultra-2-vs-galaxy-watch-7-ultra',
        content: `<h2>So sánh Apple Watch Ultra 2 vs Samsung Galaxy Watch 7 Ultra</h2>
<p>Cả hai đều là những chiếc đồng hồ thông minh cao cấp nhất hiện nay. Hãy cùng so sánh để chọn ra sản phẩm phù hợp.</p>

<table>
<tr><th>Tiêu chí</th><th>Apple Watch Ultra 2</th><th>Galaxy Watch 7 Ultra</th></tr>
<tr><td>Màn hình</td><td>49mm Always-On Retina</td><td>47mm Super AMOLED</td></tr>
<tr><td>Chip</td><td>S9</td><td>Exynos W1000</td></tr>
<tr><td>Pin</td><td>36 giờ</td><td>60 giờ</td></tr>
<tr><td>Kháng nước</td><td>100m</td><td>50m (5ATM)</td></tr>
<tr><td>Giá</td><td>20.990.000₫</td><td>11.990.000₫</td></tr>
</table>

<p>Kết luận: Nếu bạn dùng iPhone, Apple Watch Ultra 2 là lựa chọn tối ưu. Nếu bạn dùng Galaxy, Watch 7 Ultra là sản phẩm đáng mua hơn với giá tốt hơn.</p>`,
        slug: 'so-sanh-apple-watch-ultra-2-vs-galaxy-watch-7-ultra',
        author: null,
        tags: ['Đồng hồ', 'So sánh', 'Apple', 'Samsung'],
        image: '/uploads/blogs/so-sanh-dong-ho.png',
        isActive: true,
    },
    {
        title: 'Hướng dẫn mua laptop sinh viên 2026',
        slug: 'huong-dan-mua-laptop-sinh-vien-2026',
        content: `<h2>Hướng dẫn mua laptop sinh viên 2026</h2>
<p>Laptop là công cụ học tập quan trọng. Dưới đây là những tiêu chí chọn laptop cho sinh viên năm 2026.</p>

<h3>1. Xác định nhu cầu</h3>
<p>Với sinh viên văn phòng, một chiếc laptop 15-20 triệu là đủ. Với sinh viên đồ họa, cần đầu tư từ 30 triệu trở lên.</p>

<h3>2. Cấu hình tối thiểu</h3>
<ul>
<li>CPU: Intel i5 / Apple M4 / AMD Ryzen 5</li>
<li>RAM: 16GB</li>
<li>SSD: 512GB</li>
<li>Màn hình: Full HD IPS</li>
</ul>

<h3>3. Thời lượng pin</h3>
<p>Nên chọn laptop có pin từ 8 giờ trở lên để đủ cho một ngày học tập.</p>

<h3>4. Gợi ý sản phẩm</h3>
<ul>
<li><strong>MacBook Pro M4</strong> — dành cho sinh viên đồ họa, lập trình (từ 43.990.000₫)</li>
<li><strong>MacBook Air M3</strong> — dành cho sinh viên văn phòng (từ 25.990.000₫)</li>
<li><strong>Lenovo ThinkPad</strong> — dành cho sinh viên kỹ thuật</li>
</ul>

<p>Đến ngay Di Động Việt để được tư vấn miễn phí và nhận ưu đãi sinh viên!</p>`,
        author: null,
        tags: ['Laptop', 'Sinh viên', 'Hướng dẫn mua'],
        image: '/uploads/blogs/laptop-sinh-vien.png',
        isActive: true,
    },
];

// ======================== HÀM HASH PASSWORD ========================
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// ======================== HÀM TẠO SKU ========================
const generateSKU = (productName, color, ram, rom) => {
    const brandMap = {
        'Apple': 'APL',
        'Samsung': 'SAM',
        'OPPO': 'OPP',
        'Xiaomi': 'XIA',
    };

    const brand = Object.keys(brandMap).find((b) => productName.includes(b)) || 'GEN';
    const code = brandMap[brand] || 'GEN';

    // Lấy chữ cái đầu của từng từ trong tên sản phẩm
    const nameParts = productName
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .filter((w) => w.length > 0)
        .map((w) => w[0].toUpperCase())
        .join('');

    const colorCode = color
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);

    const ramCode = ram ? ram.replace('GB', '') : '00';
    const romCode = rom ? rom.replace('GB', '') : '00';

    return `${code}-${nameParts}-${colorCode}-${ramCode}-${romCode}`;
};

// ======================== HÀM SEED CHÍNH ========================
const seedData = async () => {
    try {
        console.log('\n===== 🌱 BẮT ĐẦU SEED DATA DI ĐỘNG VIỆT =====\n');

        // 1. Xóa dữ liệu cũ
        console.log('🗑️  Đang xóa dữ liệu cũ...');
        await Promise.all([
            Account.deleteMany({}),
            Category.deleteMany({}),
            Product.deleteMany({}),
            Branch.deleteMany({}),
            Voucher.deleteMany({}),
            Blog.deleteMany({}),
        ]);
        console.log('✅ Đã xóa dữ liệu cũ thành công!\n');

        // 2. Tạo tài khoản
        console.log('👤 Đang tạo tài khoản...');
        const hashedAccounts = await Promise.all(
            accountsData.map(async (acc) => ({
                ...acc,
                password: await hashPassword(acc.password),
            }))
        );
        const createdAccounts = await Account.insertMany(hashedAccounts);
        console.log(`✅ Đã tạo ${createdAccounts.length} tài khoản:`);
        createdAccounts.forEach((acc) => {
            console.log(`   - ${acc.email} (${acc.role})`);
        });
        console.log('');

        // Lấy admin account để gán author cho blog
        const adminAccount = createdAccounts.find((acc) => acc.role === 'admin');

        // 3. Tạo danh mục (không có ancestors - cấp 1)
        console.log('📂 Đang tạo danh mục...');
        const createdCategories = await Category.insertMany(categoriesData);
        console.log(`✅ Đã tạo ${createdCategories.length} danh mục:`);
        createdCategories.forEach((cat) => console.log(`   - ${cat.name}`));
        console.log('');

        // Lưu mapping tên danh mục -> ObjectId
        const categoryMap = {};
        createdCategories.forEach((cat) => {
            categoryMap[cat.name] = cat._id;
        });

        // 4. Tạo sản phẩm
        console.log('📱 Đang tạo sản phẩm...');
        const createdProducts = [];

        for (const prodData of productsData) {
            // Xác định category dựa trên tên sản phẩm
            let categoryId;
            if (prodData.name.toLowerCase().includes('iphone') ||
                prodData.name.toLowerCase().includes('samsung galaxy') ||
                prodData.name.toLowerCase().includes('oppo') ||
                prodData.name.toLowerCase().includes('xiaomi')) {
                if (prodData.name.toLowerCase().includes('galaxy watch')) {
                    categoryId = categoryMap['Đồng hồ thông minh'];
                } else {
                    categoryId = categoryMap['Điện thoại thông minh'];
                }
            } else if (prodData.name.toLowerCase().includes('macbook') ||
                prodData.name.toLowerCase().includes('laptop')) {
                categoryId = categoryMap['Laptop'];
            } else if (prodData.name.toLowerCase().includes('ipad')) {
                categoryId = categoryMap['Tablet'];
            } else if (prodData.name.toLowerCase().includes('watch') ||
                prodData.name.toLowerCase().includes('galaxy watch')) {
                categoryId = categoryMap['Đồng hồ thông minh'];
            } else {
                categoryId = categoryMap['Phụ kiện'];
            }

            // Tạo variants với SKU
            const variants = prodData.variants.map((v) => ({
                color: v.color,
                ram: v.ram,
                rom: v.rom,
                price: v.price,
                salePrice: v.salePrice || v.price,
                sku: generateSKU(prodData.name, v.color, v.ram, v.rom),
                variantImage: '',
            }));

            const product = await Product.create({
                name: prodData.name,
                brand: prodData.brand,
                category: categoryId,
                condition: prodData.condition,
                warrantyPeriod: prodData.warrantyPeriod,
                description: prodData.description,
                images: prodData.images,
                variants: variants,
                discountDMember: prodData.discountDMember,
                tradeInBonus: prodData.tradeInBonus,
                ratingsAverage: prodData.ratingsAverage,
                ratingsCount: prodData.ratingsCount,
                isActive: prodData.isActive,
            });

            createdProducts.push(product);
        }

        console.log(`✅ Đã tạo ${createdProducts.length} sản phẩm:`);
        createdProducts.forEach((p) => {
            const variantCount = p.variants ? p.variants.length : 0;
            const minPrice = Math.min(...(p.variants || []).map((v) => v.salePrice || v.price));
            const formattedPrice = new Intl.NumberFormat('vi-VN').format(minPrice);
            console.log(`   - ${p.name} (${variantCount} variants, từ ${formattedPrice}₫)`);
        });
        console.log('');

        // 5. Tạo chi nhánh
        console.log('🏪 Đang tạo chi nhánh...');
        const createdBranches = await Branch.insertMany(branchesData);
        console.log(`✅ Đã tạo ${createdBranches.length} chi nhánh:`);
        createdBranches.forEach((b) => console.log(`   - ${b.name}`));
        console.log('');

        // 6. Tạo voucher
        console.log('🎫 Đang tạo voucher...');
        const createdVouchers = await Voucher.insertMany(vouchersData);
        console.log(`✅ Đã tạo ${createdVouchers.length} voucher:`);
        createdVouchers.forEach((v) => {
            const discount =
                v.type === 'percentage'
                    ? `${v.value}% (tối đa ${new Intl.NumberFormat('vi-VN').format(v.maxDiscount)}₫)`
                    : `${new Intl.NumberFormat('vi-VN').format(v.value)}₫`;
            const condition =
                v.minOrderValue > 0
                    ? `Đơn từ ${new Intl.NumberFormat('vi-VN').format(v.minOrderValue)}₫`
                    : 'Không yêu cầu tối thiểu';
            console.log(`   - ${v.code}: Giảm ${discount} (${condition})`);
        });
        console.log('');

        // 7. Tạo blog
        console.log('📝 Đang tạo blog...');
        const blogsWithAuthor = blogsData.map((blog) => ({
            ...blog,
            author: adminAccount ? adminAccount._id : null,
        }));
        const createdBlogs = await Blog.insertMany(blogsWithAuthor);
        console.log(`✅ Đã tạo ${createdBlogs.length} bài viết:`);
        createdBlogs.forEach((b) => console.log(`   - ${b.title}`));
        console.log('');

        // ======================== TỔNG KẾT ========================
        console.log('===== 📊 TỔNG KẾT SEED DATA =====');
        console.log(`   👤 Tài khoản:       ${createdAccounts.length}`);
        console.log(`   📂 Danh mục:        ${createdCategories.length}`);
        console.log(`   📱 Sản phẩm:        ${createdProducts.length}`);
        console.log(`   🏪 Chi nhánh:       ${createdBranches.length}`);
        console.log(`   🎫 Voucher:         ${createdVouchers.length}`);
        console.log(`   📝 Blog:            ${createdBlogs.length}`);
        console.log('');
        console.log('🔐 Tài khoản đăng nhập:');
        console.log('   Admin:  admin@didongviet.vn / Admin@123');
        console.log('   User:   nguyenvana@email.com / User@123');
        console.log('   User:   tranthib@email.com / User@123');
        console.log('');
        console.log('✅ SEED DATA HOÀN TẤT! 🎉\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi seed data:', error);
        process.exit(1);
    }
};

// ======================== CHẠY SCRIPT ========================
const run = async () => {
    const conn = await connectDB();
    await seedData();
    await conn.disconnect();
};

run();