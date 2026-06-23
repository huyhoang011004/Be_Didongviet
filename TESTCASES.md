# 🧪 BẢNG TEST CASES — HỆ THỐNG QUẢN LÝ & BÁN HÀNG DI ĐỘNG VIỆT

**Người thực hiện:** Chuyên viên Kiểm thử  
**Ngày:** 23/06/2026  
**Phiên bản:** 1.0

---

## Mục lục

- [Nhóm 1: Luồng khách hàng mua điện thoại](#-nhóm-1-luồng-khách-hàng-mua-điện-thoại-12-test-cases)
- [Nhóm 2: Luồng admin/nhân viên quản lý](#-nhóm-2-luồng-adminnhân-viên-quản-lý-10-test-cases)
- [Nhóm 3: Bảo mật & ràng buộc logic](#-nhóm-3-bảo-mật--ràng-buộc-logic-8-test-cases)
- [Tổng kết](#-tổng-kết)

---

## 👤 NHÓM 1: Luồng khách hàng mua điện thoại (12 Test Cases)

### Mục tiêu
Kiểm tra toàn bộ quy trình mua hàng của khách hàng: từ tìm kiếm sản phẩm, lọc theo danh mục/cấu hình, xem chi tiết, thêm vào giỏ hàng, áp dụng voucher, đến đặt hàng giao tận nơi hoặc nhận tại chi nhánh.

| STT | Chức năng kiểm thử | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi |
|-----|-------------------|-------------------|-----------------|------------------|
| **TC01** | Tìm kiếm sản phẩm theo từ khóa | 1. Gửi GET `/api/v1/products/search?q=iphone`<br>2. Kiểm tra kết quả trả về | `q=iphone`, `limit=10` (mặc định) | ✅ Trả về danh sách sản phẩm có tên/brand chứa "iphone", sắp xếp theo độ liên quan (score giảm dần). Mỗi sản phẩm có `_id, name, slug, thumbnail, price, oldPrice, category, brand` |
| **TC02** | Tìm kiếm với từ khóa rỗng | 1. Gửi GET `/api/v1/products/search?q=` | `q=` (chuỗi rỗng) | ✅ Trả về `{ success: true, data: [] }` — mảng rỗng, không báo lỗi |
| **TC03** | Lọc sản phẩm theo danh mục + thương hiệu + sắp xếp giá | 1. Gửi GET `/api/v1/products/category/:categoryID?brand=Apple&sort=price_asc` | `categoryID` = ID danh mục "Điện thoại", `brand=Apple`, `sort=price_asc` | ✅ Trả về sản phẩm thuộc danh mục và danh mục con, chỉ lọc brand Apple, sắp xếp giá tăng dần. Có phân trang (`currentPage, totalPages, totalProducts`) |
| **TC04** | Xem chi tiết sản phẩm theo slug | 1. Gửi GET `/api/v1/products/iphone-16-pro-max` | `id` = slug "iphone-16-pro-max" | ✅ Trả về chi tiết sản phẩm: thông tin variants (màu sắc, RAM/ROM, giá, SKU), danh sách ảnh, category, đánh giá, `tradeInBonus`, `discountDMember` |
| **TC05** | Xem sản phẩm không tồn tại (404) | 1. Gửi GET `/api/v1/products/abcxyz123` | `id` = slug/ObjectId không hợp lệ | ❌ Trả về `{ success: false, message: 'Không tìm thấy sản phẩm' }` — status 404 |
| **TC06** | Thêm sản phẩm vào giỏ hàng (còn hàng) | 1. Đăng nhập → lấy token<br>2. Gửi POST `/api/v1/cart` (Bearer token)<br>3. Body: `{ productId, variantId, quantity: 1 }` | `productId` = ObjectId iPhone 16 Pro Max, `variantId` = ID variant Titan Xám 256GB, `quantity=1` | ✅ Thêm thành công. Nếu giỏ đã có sản phẩm → tăng quantity. Trả về cart với items đã cập nhật |
| **TC07** | Thêm vào giỏ — hết hàng (quantity > tồn kho) | 1. Gửi POST `/api/v1/cart` với quantity > actualStock | `quantity=999` (lớn hơn tồn kho thực tế) | ❌ Trả về `{ success: false, message: 'Rất tiếc, phiên bản này chỉ còn X sản phẩm' }` — status 400 |
| **TC08** | Thêm vào giỏ — variant không hợp lệ | 1. Gửi POST `/api/v1/cart` với variantId sai | `variantId` = ObjectId không tồn tại | ❌ Trả về `{ success: false, message: 'Phiên bản không hợp lệ' }` — status 404 |
| **TC09** | Cập nhật số lượng trong giỏ hàng | 1. Gửi PUT `/api/v1/cart`<br>2. Body: `{ productId, variantId, quantity: 3 }` | `quantity=3` (≤ tồn kho) | ✅ Cập nhật thành công. Nếu quantity < 1 → ❌ báo lỗi 'Số lượng phải lớn hơn 0' |
| **TC10** | Áp dụng mã giảm giá hợp lệ | 1. Gửi POST `/api/v1/cart/apply-voucher`<br>2. Body: `{ voucherCode: "WELCOME10" }` | `voucherCode=WELCOME10` (giảm 10%, tối đa 200K) | ✅ Trả về `{ success: true, data: { voucherCode, subTotal, discountAmount, finalPrice } }`. Giỏ hàng cập nhật `appliedVoucher` |
| **TC11** | Áp dụng mã giảm giá hết lượt | 1. Gửi POST `/api/v1/cart/apply-voucher` với mã đã hết lượt | `voucherCode` có `usedCount >= usageLimit` | ❌ Trả về `{ success: false, message: 'Mã giảm giá đã hết lượt sử dụng' }` — status 400 |
| **TC12** | Đặt hàng — giao tận nơi (COD) | 1. Gửi POST `/api/v1/orders` (Bearer token)<br>2. Body: `{ orderItems, shippingAddress, paymentMethod: "COD", branchId, shippingPrice }` | `orderItems` = [ { product, variantId, qty } ], `shippingAddress` đầy đủ, `branchId` = ID chi nhánh | ✅ Tạo đơn hàng (status 201). Kiểm tra:<br>• Inventory giảm đúng số lượng<br>• Cart xóa item đã mua<br>• Voucher `usedCount` tăng 1 (nếu có)<br>• `totalPrice` = itemsPrice + shippingPrice - discount |

---

## 🔧 NHÓM 2: Luồng admin/nhân viên quản lý (10 Test Cases)

### Mục tiêu
Kiểm tra các chức năng quản trị: xử lý đơn hàng (xác nhận, giao hàng, hủy), cập nhật tồn kho theo chi nhánh, xem dashboard thống kê và biểu đồ doanh thu.

| STT | Chức năng kiểm thử | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi |
|-----|-------------------|-------------------|-----------------|------------------|
| **TC13** | Admin đăng nhập vào trang quản trị | 1. Gửi POST `/api/v1/auth/login`<br>2. Body: `{ email, password }` | `email=admin@didongviet.vn`, `password=Admin@123` | ✅ Trả về accessToken + refreshToken. Token chứa `_id` và `role='admin'` |
| **TC14** | Xem danh sách tất cả đơn hàng (Admin) | 1. Gửi GET `/api/v1/orders` (Bearer token admin) | Token admin hợp lệ | ✅ Trả về danh sách đơn hàng, populate `user(id,name)`, `branch(name,address,phone)`, `orderItems.product(variants)`. Sắp xếp mới nhất trước |
| **TC15** | Cập nhật trạng thái: Chờ xác nhận → Chờ lấy hàng | 1. Gửi PUT `/api/v1/orders/:id/status`<br>2. Body: `{ status: "Chờ lấy hàng" }` | `id` = OrderId đang "Chờ xác nhận" | ✅ Cập nhật thành công. Trạng thái chuyển "Chờ xác nhận" → "Chờ lấy hàng" |
| **TC16** | Chuyển trạng thái sai luồng (VD: Chờ xác nhận → Đã giao) | 1. Gửi PUT `/api/v1/orders/:id/status`<br>2. Body: `{ status: "Đã giao" }` | Đơn hàng đang "Chờ xác nhận" | ❌ Trả về `{ message: 'Không thể chuyển trạng thái đơn hàng theo bước này' }` — status 400. Luồng cho phép: "Chờ xác nhận" → "Chờ lấy hàng" → "Đang giao" → "Đã giao" |
| **TC17** | Chuyển "Chờ lấy hàng" → "Đang giao" (tích hợp GHN) | 1. Gửi PUT `/api/v1/orders/:id/status`<br>2. Body: `{ status: "Đang giao" }` | Đơn hàng đang "Chờ lấy hàng", chi nhánh có `ghnDistrictId` | ✅ Cập nhật thành công. Hệ thống gọi GHN API tạo vận đơn. Order lưu `ghnOrderCode, ghnOrderId, ghnExpectedDeliveryTime`. Nếu GHN lỗi → vẫn chuyển trạng thái, log lỗi (không block) |
| **TC18** | Hủy đơn hàng (khi đang "Chờ xác nhận") + hoàn kho | 1. Gửi PUT `/api/v1/orders/:id/cancel` (có token) | Đơn hàng đang "Chờ xác nhận" | ✅ Hủy thành công. Kiểm tra:<br>• `orderStatus` = "Đã hủy"<br>• Tồn kho Inventory được hoàn lại đúng số lượng<br>• `usedCount` voucher giảm 1 (nếu có) |
| **TC19** | Hủy đơn hàng khi đã "Chờ lấy hàng" (không được phép) | 1. Gửi PUT `/api/v1/orders/:id/cancel` | Đơn hàng đang "Chờ lấy hàng" | ❌ Trả về `{ message: 'Không thể hủy đơn hàng đã xác nhận hoặc đang giao' }` — status 400 |
| **TC20** | Xem Dashboard tổng quan (Admin) | 1. Gửi GET `/api/v1/analytics/dashboard-overview` (token admin) | Token admin hợp lệ | ✅ Trả về dữ liệu tổng quan: tổng doanh thu, tổng đơn hàng, tổng sản phẩm, tổng người dùng, tồn kho thấp... |
| **TC21** | Xem biểu đồ doanh thu theo tháng | 1. Gửi GET `/api/v1/analytics/chart-data?period=month&startDate=2026-01-01&endDate=2026-06-30` | `period=month`, `startDate`, `endDate` | ✅ Trả về dữ liệu biểu đồ: mảng điểm dữ liệu theo tháng (doanh thu, số đơn, lợi nhuận...) |
| **TC22** | Xem sản phẩm tồn kho thấp (Admin) | 1. Gửi GET `/api/v1/analytics/low-stock?threshold=5&limit=10` | `threshold=5`, `limit=10` | ✅ Trả về danh sách sản phẩm có tồn kho ≤ 5, sắp xếp stock tăng dần. Mỗi sản phẩm hiển thị tên, SKU, stock hiện tại |

---

## 🔒 NHÓM 3: Bảo mật & ràng buộc logic (8 Test Cases)

### Mục tiêu
Kiểm tra phân quyền giữa admin/staff/user, xác thực token, các ràng buộc nghiệp vụ (hết hàng, thiếu thông tin, quá hạn trả hàng, transaction rollback).

| STT | Chức năng kiểm thử | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi |
|-----|-------------------|-------------------|-----------------|------------------|
| **TC23** | User thường gọi API admin (phân quyền) | 1. Đăng nhập user → lấy token<br>2. Gửi GET `/api/v1/analytics/dashboard-overview` với token user | Token user (role='user') | ❌ Trả về `{ success: false, message: 'Quyền truy cập bị từ chối: Chỉ dành cho Admin' }` — status 403 |
| **TC24** | Staff gọi API yêu cầu admin (phân quyền staff) | 1. Đăng nhập staff → lấy token<br>2. Gửi POST `/api/v1/products` (tạo sản phẩm) | Token staff (role='staff') | ❌ Trả về 403 — route product dùng `adminRole`. Staff chỉ dùng được route có `staffRole` |
| **TC25** | Gọi API không có token (chưa đăng nhập) | 1. Gửi GET `/api/v1/cart` (không gửi Authorization header) | Không có token | ❌ Trả về `{ success: false, message: 'Không có token, quyền truy cập bị từ chối' }` — status 401 |
| **TC26** | Gọi API với token hết hạn/giả mạo | 1. Gửi GET `/api/v1/orders` với token sai | `Authorization: Bearer <token_gia_mao>` | ❌ Trả về `{ success: false, message: 'Token không hợp lệ hoặc đã hết hạn hạn' }` — status 401 |
| **TC27** | Đặt hàng khi sản phẩm hết hàng trong kho (Transaction rollback) | 1. Tạo Inventory với stock=0 cho variant<br>2. Gửi POST `/api/v1/orders` với variant đó, qty=1 | `stock=0`, `qty=1` | ❌ Trả về `{ message: 'Sản phẩm "iPhone 16 Pro Max" có phiên bản hoặc số lượng không đủ trong kho tại chi nhánh đã chọn, vui lòng kiểm tra lại!' }` — status 400. Transaction rollback, không trừ kho |
| **TC28** | Đặt hàng thiếu thông tin giao hàng | 1. Gửi POST `/api/v1/orders` thiếu `shippingAddress.phone` | `shippingAddress` = { fullName, province, district, ward, streetAddress } — thiếu phone | ❌ Trả về `{ message: 'Vui lòng cung cấp đầy đủ thông tin nhận hàng (Tên, Số điện thoại, Tỉnh/thành, Quận/huyện, Phường/xã, Địa chỉ)' }` — status 400 |
| **TC29** | Đặt hàng không chọn chi nhánh | 1. Gửi POST `/api/v1/orders` không gửi `branchId` | Body không có `branchId` | ❌ Trả về `{ message: 'Vui lòng chọn chi nhánh nhận hàng!' }` — status 400 |
| **TC30** | Yêu cầu trả hàng sau 7 ngày (quá hạn) | 1. Tạo đơn hàng đã giao với `deliveredAt` = 10 ngày trước<br>2. Gửi POST `/api/v1/orders/:id/return` | `deliveredAt` = 10 ngày trước, `reason` = "Lỗi sản phẩm" | ❌ Trả về `{ message: 'Đã quá thời hạn 7 ngày kể từ khi nhận hàng để yêu cầu trả hàng' }` — status 400 |

---

## 📊 Tổng kết

| Nhóm | Số lượng | Mã TC | Mục tiêu |
|------|----------|-------|----------|
| **1. Luồng khách hàng mua điện thoại** | 12 TC | TC01 → TC12 | Kiểm tra toàn bộ quy trình mua hàng: tìm kiếm, lọc, giỏ hàng, voucher, đặt hàng |
| **2. Luồng admin/nhân viên quản lý** | 10 TC | TC13 → TC22 | Kiểm tra quản lý đơn hàng, tồn kho, dashboard, biểu đồ, tích hợp GHN |
| **3. Bảo mật & ràng buộc logic** | 8 TC | TC23 → TC30 | Kiểm tra phân quyền, xác thực, ràng buộc nghiệp vụ, transaction |
| **Tổng cộng** | **30 TC** | | |

### Các kịch bản đặc biệt đã bao phủ

| Kịch bản | Mã TC | Mô tả |
|----------|-------|-------|
| ✅ **Transaction rollback** | TC27 | Khi đặt hàng lỗi, toàn bộ giao dịch rollback — không mất kho, không tạo đơn |
| ✅ **Hoàn tồn kho khi hủy đơn** | TC18 | Hủy đơn thành công → Inventory được cộng lại số lượng |
| ✅ **State machine đơn hàng** | TC15, TC16, TC17 | Chỉ cho phép chuyển đúng luồng: "Chờ xác nhận" → "Chờ lấy hàng" → "Đang giao" → "Đã giao" |
| ✅ **Phân quyền 3 cấp** | TC23, TC24, TC25, TC26 | user / staff / admin — mỗi cấp chỉ truy cập được API tương ứng |
| ✅ **Ràng buộc thời gian trả hàng** | TC30 | Chỉ được trả hàng trong vòng 7 ngày kể từ khi nhận |
| ✅ **Kiểm tra tồn kho trước đặt hàng** | TC07, TC27 | Cả khi thêm giỏ và khi đặt hàng đều kiểm tra tồn kho |
| ✅ **Tích hợp GHN** | TC17 | Khi chuyển "Chờ lấy hàng" → "Đang giao", tự động tạo vận đơn GHN (không block nếu lỗi) |
| ✅ **Voucher logic** | TC10, TC11 | Kiểm tra hết lượt dùng, giới hạn số lần/user |
| ✅ **Bắt buộc chọn chi nhánh** | TC29 | Không cho phép đặt hàng nếu không chọn chi nhánh |