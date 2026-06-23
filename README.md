# 🏪 BE_DIDONGVIET_EXPRESSJS — Backend Hệ thống quản lý & bán hàng Di Động Việt

**Đồ án tốt nghiệp** — Backend API cho hệ thống thương mại điện tử của chuỗi cửa hàng điện thoại Di Động Việt.  
Xây dựng bằng **Node.js + Express.js 5 + MongoDB (Mongoose)**.

> ⚠️ **Repository riêng**: Đây là mã nguồn **Backend**. Repository Frontend riêng tại:  
> `https://github.com/huyhoang011004/Be_Didongviet`

---

## 📋 Mục lục

- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống-prerequisites)
- [Hướng dẫn cài đặt](#-hướng-dẫn-cài-đặt)
- [Cấu hình biến môi trường](#-cấu-hình-biến-môi-trường)
- [Import dữ liệu mẫu (Seed Data)](#-import-dữ-liệu-mẫu-seed-data)
- [Chạy dự án](#-chạy-dự-án)
- [API Endpoints](#-api-endpoints)

---

## 🚀 Công nghệ sử dụng

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| Node.js | ≥ 18.x | Runtime JavaScript |
| Express.js | 5.x | Web framework |
| MongoDB | 7.x | Cơ sở dữ liệu NoSQL |
| Mongoose | 9.x | ODM cho MongoDB |
| JSON Web Token | 9.x | Xác thực người dùng |
| Nodemailer | 8.x | Gửi email OTP |
| Multer | 2.x | Upload file |
| Sharp | 0.34.x | Xử lý ảnh |
| Helmet | 8.x | Bảo mật HTTP headers |
| Slugify | 1.6.x | Tạo slug tự động |

---

## 📁 Cấu trúc thư mục

```
be_didongviet_expressjs/
├── server.js                     # Entry point
├── scripts/
│   └── seed.js                   # Script seed data
├── src/
│   ├── app.js                    # Cấu hình Express app
│   ├── config/
│   │   └── db.js                 # Kết nối MongoDB
│   ├── middlewares/
│   │   ├── auth.middleware.js    # JWT + RBAC (protect, adminRole, staffRole)
│   │   ├── error.middleware.js   # Xử lý lỗi tập trung
│   │   └── upload.middleware.js  # Upload file (multer)
│   ├── modules/                  # 16 Domain Modules
│   │   ├── Account/             # Quản lý người dùng
│   │   ├── Analytics/           # Thống kê báo cáo
│   │   ├── Auth/                # Đăng nhập, đăng ký, OTP
│   │   ├── Blog/                # Tin tức
│   │   ├── Branch/              # Chi nhánh cửa hàng
│   │   ├── Cart/                # Giỏ hàng
│   │   ├── Category/            # Danh mục sản phẩm
│   │   ├── Contact/             # Liên hệ hỗ trợ
│   │   ├── FlashSale/           # Flash sale
│   │   ├── GHN/                 # Giao Hàng Nhanh
│   │   ├── Inventory/           # Tồn kho
│   │   ├── Order/               # Đơn hàng
│   │   ├── Payment/             # Thanh toán (MOMO, VNPAY)
│   │   ├── Product/             # Sản phẩm
│   │   ├── Review/              # Đánh giá
│   │   ├── StudentProfile/      # Hồ sơ sinh viên
│   │   └── Voucher/             # Mã giảm giá
│   ├── routes/
│   │   └── index.js             # Route Registry (tập trung)
│   └── utils/                   # Tiện ích (slugify, email, helpers...)
├── .env.example                 # Mẫu biến môi trường
├── TESTCASES.md                 # Bảng Test Cases
└── package.json
```

---

## ✅ Yêu cầu hệ thống (Prerequisites)

| Công cụ | Phiên bản tối thiểu | Tải về |
|---------|---------------------|--------|
| **Node.js** | ≥ 18.x (khuyến nghị 20.x LTS) | [nodejs.org](https://nodejs.org) |
| **npm** | ≥ 9.x (đi kèm Node.js) | — |
| **MongoDB** | ≥ 7.x | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **Git** | ≥ 2.x | [git-scm.com](https://git-scm.com) |

> **Ghi chú:** Có thể sử dụng **MongoDB Atlas** (cloud) thay vì cài MongoDB local.

### Kiểm tra phiên bản đã cài đặt

```bash
node --version    # Ví dụ: v20.18.0
npm --version     # Ví dụ: 10.8.0
mongod --version  # Ví dụ: 7.0.0
```

---

## 📥 Hướng dẫn cài đặt

### 1. Clone dự án

```bash
git clone https://github.com/<your-username>/be_didongviet_expressjs.git
cd be_didongviet_expressjs
```

### 2. Cài đặt dependencies & tạo file .env

```bash
npm install
copy .env.example .env    # Trên Windows
# hoặc: cp .env.example .env   # Trên Linux/Mac
```

### 3. Cấu hình .env

Mở file `.env` và điền các giá trị (xem chi tiết ở phần [Cấu hình biến môi trường](#-cấu-hình-biến-môi-trường)).

---

## 🔐 Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc và cấu hình các khóa sau:

| Biến | Bắt buộc | Mô tả | Giá trị mẫu |
|------|----------|-------|-------------|
| `NODE_ENV` | ✅ | Môi trường chạy | `development` |
| `PORT` | ❌ | Cổng server (mặc định 5000) | `5000` |
| `MONGODB_CONNECTION_STRING` | ✅ | Chuỗi kết nối MongoDB | `mongodb://localhost:27017/didongviet` |
| `BASE_URL` | ❌ | Base URL cho ảnh | `http://localhost:5000` |
| `ACCESS_TOKEN_SECRET` | ✅ | Khóa bí mật JWT | (tạo chuỗi ngẫu nhiên) |
| `ACCESS_TOKEN_TTL` | ❌ | Thời gian sống access token | `7d` |
| `REFRESH_TOKEN_TTL` | ❌ | Thời gian sống refresh token | `30d` |
| `GMAIL_ADMIN` | ✅ | Email gửi OTP | `your-email@gmail.com` |
| `GMAIL_APP_PASSWORD` | ✅ | Mật khẩu ứng dụng Gmail (16 ký tự) | (tạo từ Google) |
| `MOMO_*` | ❌ | Cấu hình thanh toán MOMO (sandbox) | Giá trị mặc định có sẵn |
| `VNPAY_*` | ❌ | Cấu hình thanh toán VNPAY (sandbox) | Giá trị mặc định có sẵn |
| `GHN_*` | ❌ | Cấu hình Giao Hàng Nhanh | — |

> **Tạo ACCESS_TOKEN_SECRET:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

> **Tạo mật khẩu ứng dụng Gmail:**
> 1. Vào [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
> 2. Chọn "Ứng dụng khác" → Đặt tên → Lấy mật khẩu 16 ký tự

---

## 🌱 Import dữ liệu mẫu (Seed Data)

Script seed tạo dữ liệu mẫu gồm: tài khoản, danh mục, sản phẩm, chi nhánh, voucher, blog.

```bash
npm run seed
```

### Dữ liệu mẫu sẽ được tạo

| Dữ liệu | Số lượng | Chi tiết |
|---------|----------|----------|
| Tài khoản Admin | 1 | `admin@didongviet.vn` / `Admin@123` |
| Tài khoản User | 2 | `nguyenvana@email.com` / `User@123` |
| Danh mục | 6 | Điện thoại, Laptop, Tablet, Đồng hồ, Phụ kiện, Máy cũ |
| Sản phẩm | 10 | iPhone 16 Pro Max, Samsung S25 Ultra, OPPO Find X8... |
| Chi nhánh | 6 | Hồ Chí Minh (2), Hà Nội, Đà Nẵng, Cần Thơ, Hải Phòng |
| Voucher | 4 | DIDONGVIET50, DIDONGVIET100, WELCOME10, FlashSale20 |
| Blog | 3 | Bài viết tin tức công nghệ |

---

## 🏃 Chạy dự án

### Môi trường Development

```bash
npm run dev
```

Server sẽ chạy tại: **http://localhost:5000** (tự động reload khi có thay đổi code — Nodemon)

### Môi trường Production

```bash
NODE_ENV=production npm start
```

---

## 🔌 API Endpoints

Backend cung cấp RESTful API với prefix `/api/v1`. Các nhóm API chính:

| Nhóm | Base path | Mô tả |
|------|-----------|-------|
| Auth | `/api/v1/auth` | Đăng nhập, đăng ký, OTP, Google Login |
| Account | `/api/v1/accounts` | Quản lý người dùng |
| Product | `/api/v1/products` | Sản phẩm, variants, tìm kiếm |
| Category | `/api/v1/categories` | Danh mục sản phẩm |
| Cart | `/api/v1/cart` | Giỏ hàng, voucher |
| Order | `/api/v1/orders` | Đơn hàng, trả hàng |
| Voucher | `/api/v1/vouchers` | Mã giảm giá |
| Branch | `/api/v1/branches` | Chi nhánh |
| Review | `/api/v1/reviews` | Đánh giá |
| Blog | `/api/v1/blogs` | Tin tức |
| Contact | `/api/v1/contacts` | Liên hệ |
| Payment | `/api/v1/payment` | Thanh toán (MOMO, VNPAY) |
| GHN | `/api/v1/ghn` | Giao Hàng Nhanh |
| Inventory | `/api/v1/inventory` | Tồn kho |
| FlashSale | `/api/v1/flash-sales` | Flash sale |
| Analytics | `/api/v1/analytics` | Thống kê (admin) |
| StudentProfile | `/api/v1/student-profile` | Hồ sơ sinh viên |

---

> ⚡ **Tác giả:** Nguyễn Văn Huy Hoàng  
> **Đề tài:** Hệ thống quản lý và bán hàng trực tuyến cho chuỗi cửa hàng Di Động Việt  
> **Frontend:** https://github.com/<your-username>/fe_didongviet_nextjs