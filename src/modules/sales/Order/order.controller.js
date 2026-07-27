import mongoose from 'mongoose';
import Order from '#order/Order.model.js';
import Product from '#product/Product.model.js';
import Account from '#account/Account.model.js';
import Cart from '#cart/Cart.model.js';
import Inventory from '#inventory/Inventory.model.js';
import Voucher from '#voucher/Voucher.model.js';
import fs from 'fs';
import path from 'path';
import { compressImage, compressVideo } from '#utils/compressMedia.js';
import Branch from '#branch/Branch.model.js';
import { createShippingOrder } from '#ghn/ghn.service.js';
import FlashSale from '#flashSale/FlashSale.model.js';
import { createOrderService, cancelOrderService } from './order.service.js';

const normalizeOrderStatus = (status) => {
    const statusMap = {
        'Đang xử lý': 'Chờ xác nhận',
        'Đã xác nhận': 'Chờ lấy hàng',
        'Đang giao hàng': 'Đang giao',
        'Đã hoàn thành': 'Đã giao'
    };

    return statusMap[status] || status || 'Chờ xác nhận';
};

export const searchOrders = async (req, res, next) => {
    try {
        const { q } = req.query;

        // Nếu không có từ khóa, trả về mảng rỗng để FE đóng dropdown preview nhanh
        if (!q || !q.trim()) {
            return res.status(200).json({ success: true, data: [] });
        }

        const searchKey = q.trim();
        let queryCondition = {};

        // 1. KIỂM TRA ĐỊNH DẠNG TỪ KHÓA TÌM KIẾM
        // Kiểm tra xem chuỗi nhập vào có phải là Số điện thoại không (toàn số, từ 9-11 ký tự)
        const isPhoneNumber = /^\d+$/.test(searchKey) && searchKey.length >= 9 && searchKey.length <= 11;

        if (isPhoneNumber) {
            // Khớp chính xác số điện thoại nằm trong object shippingAddress
            queryCondition = { 'shippingAddress.phone': searchKey };
        } else {
            // Nếu không phải số điện thoại, kiểm tra xem có phải chuỗi ObjectId hợp lệ của MongoDB không
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchKey);

            if (isValidObjectId) {
                // Khách hàng hoặc Admin paste thẳng mã đơn hàng (_id) dạng ObjectId
                queryCondition = { _id: searchKey };
            } else {
                // Nếu là chuỗi ký tự thông thường, tìm kiếm gần đúng (Regex) theo _id 
                // (MongoDB cho phép cast _id thành chuỗi khi dùng Regex aggregate nhưng tìm find thông thường sẽ lỗi,
                // vì vậy ở đây ta hỗ trợ tìm gần đúng nếu schema của bạn có trường orderCode hoặc chỉ khớp chính xác _id)
                return res.status(200).json({ success: true, data: [] });
            }
        }

        // 2. TRUY VẤN DATABASE
        // Lấy ra tối đa 5 đơn hàng mới nhất để tối ưu hiệu năng preview cho Frontend
        const orders = await Order.find(queryCondition)
            .sort({ createdAt: -1 })
            .limit(5);

        // 3. ĐỒNG BỘ ĐẦU RA (FORMAT DATA) VỚI CẤU TRÚC FRONTEND CẦN
        const formattedOrders = orders.map(order => {
            // Gom thông tin sản phẩm đầu tiên hoặc tạo chuỗi tóm tắt để hiển thị ở Preview cho đẹp
            const firstItemName = order.orderItems?.[0]?.name || "Đơn hàng";
            const itemCount = order.orderItems?.length || 0;
            const orderSummary = itemCount > 1 ? `${firstItemName} (và ${itemCount - 1} sản phẩm khác)` : firstItemName;

            return {
                _id: order._id,
                code: order._id.toString().slice(-6).toUpperCase(), // Tạo mã hiển thị ngắn 6 ký tự cuối từ _id nếu bạn không dùng trường code riêng
                fullId: order._id, // Giữ lại ID gốc để FE làm router điều hướng
                customerName: order.shippingAddress?.fullName,
                totalPrice: order.totalPrice,
                status: order.orderStatus,
                summary: orderSummary,
                type: 'order' // Tag định danh dữ liệu đơn hàng
            };
        });

        return res.status(200).json({
            success: true,
            count: formattedOrders.length,
            data: formattedOrders
        });

    } catch (error) {
        next(error);
    }
};

// XEM TRƯỚC HÓA ĐƠN VÀ LẤY ĐỊA CHỈ TỰ ĐỘNG (Dùng khi vừa vào trang Order)
export const checkoutPreview = async (req, res) => {
    try {
        const { orderItems } = req.body;
        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm nào để thanh toán' });
        }

        // 1. Tìm thông tin Account của user đang đăng nhập
        const userProfile = await Account.findById(req.user._id);

        // Tìm địa chỉ được đánh dấu mặc định (isDefault = true)
        const defaultAddress = userProfile?.address?.find(addr => addr.isDefault === true)
            || userProfile?.address?.[0]; // Nếu không có cái nào mặc định, lấy cái đầu tiên

        // Tạo object trả về cấu trúc chi tiết cho Front-end
        const defaultShipping = {
            fullName: userProfile?.name || '',
            phone: userProfile?.phone || '',
            province: defaultAddress?.province || '',
            district: defaultAddress?.district || '',
            ward: defaultAddress?.ward || '',
            streetAddress: defaultAddress?.streetAddress || ''
        };

        // Kiểm tra Flash Sale đang hoạt động
        const now = new Date();
        const currentHour = now.getHours();
        const activeSale = await FlashSale.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        });

        let activeSaleProducts = [];
        let activeSaleId = null;
        if (activeSale) {
            const activeSlot = activeSale.timeSlots.find(slot => currentHour >= slot && currentHour < (slot + (activeSale.duration / 60)));
            if (activeSlot !== undefined) {
                activeSaleProducts = activeSale.products;
                activeSaleId = activeSale._id;
            }
        }

        // 2. Logic tính toán giá tiền 
        let itemsPrice = 0;
        const verifiedItems = [];
        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (!product) return res.status(404).json({ message: `Không tìm thấy sản phẩm ID: ${item.product}` });

            let variant = null;
            if (item.variantId) {
                variant = Array.isArray(product.variants)
                    ? product.variants.find(v => String(v._id) === String(item.variantId))
                    : null;
                if (!variant) {
                    return res.status(404).json({ message: `Không tìm thấy biến thể cho sản phẩm ID: ${item.product}` });
                }
            }

            let price = variant
                ? (variant.salePrice || variant.price || 0)
                : (product.price || (Array.isArray(product.variants) && product.variants.length > 0
                    ? (product.variants[0].salePrice || product.variants[0].price || 0)
                    : 0));

            // Ghi đè giá Flash Sale nếu có
            if (activeSaleId) {
                const fsProduct = activeSaleProducts.find(p => String(p.product) === String(product._id));
                if (fsProduct && fsProduct.flashSalePrice) {
                    price = fsProduct.flashSalePrice;
                }
            }

            itemsPrice += price * item.qty;
            verifiedItems.push({
                product: product._id,
                variantId: item.variantId || null,
                name: product.name,
                qty: item.qty,
                image: variant?.variantImage || product.featuredImage || product.images?.[0]?.url || '',
                price,
                selectedColor: variant?.color || '',
                selectedStorage: variant?.ram && variant?.rom ? `${variant.ram}/${variant.rom}` : (variant?.storage || ''),
                sku: variant?.sku || ''
            });
        }

        res.status(200).json({
            success: true,
            shippingAddress: defaultShipping, // Trả về object địa chỉ đã bóc tách chi tiết
            orderItems: verifiedItems,
            itemsPrice,
            shippingPrice: itemsPrice > 2000000 ? 0 : 30000,
            totalPrice: itemsPrice
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addOrderItems = async (req, res) => {
    try {
        const createdOrder = await createOrderService(req.body, req.user);
        res.status(201).json({ success: true, data: createdOrder });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const cancelOrder = async (req, res) => {
    try {
        await cancelOrderService(req.params.id);
        res.status(200).json({ success: true, message: 'Đã hủy đơn hàng và hoàn tồn kho' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Xóa đơn hàng (Dành cho Admin/Staff dọn dẹp dữ liệu)
export const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        await order.deleteOne();
        res.status(200).json({ success: true, message: 'Đã xóa đơn hàng thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Lấy danh sách đơn hàng của người dùng đang đăng nhập
export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('branch', 'name address phone')
            .populate('orderItems.product', 'variants')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 4. Lấy tất cả đơn hàng (Dành cho Admin)
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'id name')
            .populate('branch', 'name address phone')
            .populate('orderItems.product', 'variants')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Cập nhật trạng thái giao hàng (Admin)
export const updateOrderToDelivered = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
            order.orderStatus = 'Đã giao';
            if (order.paymentMethod === 'COD') {
                order.isPaid = true;
                order.paidAt = order.paidAt || Date.now();
            }
            const updatedOrder = await order.save();
            res.status(200).json({ success: true, data: updatedOrder });
        } else {
            res.status(404).json({ message: 'Đơn hàng không tồn tại' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Cập nhật trạng thái thanh toán (Admin)
export const updateOrderToPaid = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentResult = {
                id: req.body.id,
                status: req.body.status,
                update_time: req.body.update_time,
                email_address: req.body.email_address
            };
            const updatedOrder = await order.save();
            res.status(200).json({ success: true, data: updatedOrder });
        } else {
            res.status(404).json({ message: 'Đơn hàng không tồn tại' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Tra cứu đơn hàng công khai (không cần đăng nhập)
export const trackOrderPublic = async (req, res, next) => {
    try {
        const { orderId, phone } = req.query;

        // 1. Validate đầu vào cơ bản
        if (!orderId || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ Mã đơn hàng và Số điện thoại'
            });
        }

        // 2. Kiểm tra định dạng ObjectId để tránh crash lỗi 500 của Mongoose
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Mã đơn hàng không đúng định dạng'
            });
        }

        // 3. Tìm kiếm kết hợp (Tối ưu performance bằng cách tìm thẳng trong DB)
        const order = await Order.findOne({
            _id: orderId,
            'shippingAddress.phone': phone.trim()
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Thông tin tra cứu không chính xác hoặc đơn hàng không tồn tại'
            });
        }

        // 4. Trả về thông tin public (Tránh trả về full dữ liệu nhạy cảm)
        return res.status(200).json({
            success: true,
            data: {
                orderId: order._id,
                status: order.orderStatus,
                isPaid: order.isPaid,
                createdAt: order.createdAt
            }
        });

    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['Chờ lấy hàng', 'Đang giao', 'Đã giao'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ' });
        }

        // Populate branch để lấy thông tin GHN
        const order = await Order.findById(req.params.id).populate('branch');
        if (!order) {
            return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
        }

        const allowedTransitions = {
            'Chờ xác nhận': ['Chờ lấy hàng'],
            'Chờ lấy hàng': ['Đang giao'],
            'Đang giao': ['Đã giao']
        };

        const currentStatus = normalizeOrderStatus(order.orderStatus);

        if (!allowedTransitions[currentStatus]?.includes(status)) {
            return res.status(400).json({ message: 'Không thể chuyển trạng thái đơn hàng theo bước này' });
        }

        // Khi chuyển từ "Chờ lấy hàng" → "Đang giao": Tạo vận đơn GHN
        if (currentStatus === 'Chờ lấy hàng' && status === 'Đang giao') {
            try {
                const branch = await Branch.findById(order.branch);
                if (branch && branch.ghnDistrictId > 0) {
                    const ghnResult = await createShippingOrder(order, branch);
                    if (ghnResult.success && ghnResult.orderCode) {
                        order.ghnOrderCode = ghnResult.orderCode;
                        order.ghnOrderId = ghnResult.orderId;
                        order.ghnExpectedDeliveryTime = ghnResult.expectedDeliveryTime || '';
                    }
                } else {
                    console.warn(`Chi nhánh ${branch?.name || order.branch} chưa cấu hình ghnDistrictId, bỏ qua tạo vận đơn GHN`);
                }
            } catch (ghnError) {
                // Log lỗi nhưng KHÔNG block việc chuyển trạng thái đơn hàng
                console.error(ghnError);
                console.error('Lỗi tạo vận đơn GHN:', ghnError.message);
            }
        }

        order.orderStatus = status;
        if (status === 'Đã giao') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
            if (order.paymentMethod === 'COD') {
                order.isPaid = true;
                order.paidAt = order.paidAt || Date.now();
            }
        }

        const updatedOrder = await order.save();
        res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// 6. Xác nhận đã nhận hàng (Dành cho khách hàng sau khi đơn hàng ở trạng thái Đã giao)
export const confirmOrderReceived = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

        if (order.orderStatus !== 'Đã giao') {
            return res.status(400).json({ message: 'Đơn hàng chưa ở trạng thái Đã giao' });
        }

        order.isReceived = true;
        order.receivedAt = Date.now();
        const updatedOrder = await order.save();
        res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// 7. Yêu cầu trả hàng (Có thể upload kèm ảnh/video làm bằng chứng)
export const requestOrderReturn = async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

        if (order.orderStatus !== 'Đã giao') {
            return res.status(400).json({ message: 'Chỉ có thể trả hàng cho đơn hàng đã giao thành công' });
        }

        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        if (order.deliveredAt && (Date.now() - new Date(order.deliveredAt).getTime() > sevenDaysInMs)) {
            return res.status(400).json({ message: 'Đã quá thời hạn 7 ngày kể từ khi nhận hàng để yêu cầu trả hàng' });
        }

        let images = [];
        let videos = [];

        // Xử lý nén và lưu ảnh return
        if (req.files?.returnImages) {
            const imageFiles = Array.isArray(req.files.returnImages)
                ? req.files.returnImages
                : [req.files.returnImages];

            if (imageFiles.length > 6) {
                return res.status(400).json({ success: false, message: 'Tối đa 6 ảnh cho yêu cầu trả hàng' });
            }

            const compressedPaths = await Promise.all(
                imageFiles.map(async (file) => {
                    const ext = path.extname(file.originalname).toLowerCase();
                    const outputFilename = file.filename.replace(ext, '.jpg');
                    const outputPath = path.join(file.destination, outputFilename);
                    try {
                        await compressImage(file.path, outputPath, { maxWidth: 1080, maxSizeMB: 2 });
                        // Xóa file gốc nếu tên khác output
                        if (file.path !== outputPath && fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                        return `/${outputPath.replace(/\\/g, '/')}`;
                    } catch (err) {
                        console.error('Error compressing return image:', err);
                        return `/${file.path.replace(/\\/g, '/')}`;
                    }
                })
            );
            images = compressedPaths;
        } else if (req.body.images) {
            images = Array.isArray(req.body.images) ? req.body.images : JSON.parse(req.body.images || '[]');
        }

        // Xử lý nén và lưu video return
        if (req.files?.returnVideo) {
            const videoFile = Array.isArray(req.files.returnVideo)
                ? req.files.returnVideo[0]
                : req.files.returnVideo;

            const ext = path.extname(videoFile.originalname).toLowerCase();
            const outputFilename = videoFile.filename.replace(ext, '.mp4');
            const outputPath = path.join(videoFile.destination, outputFilename);

            try {
                await compressVideo(videoFile.path, outputPath);
                // Xóa file gốc nếu tên khác output
                if (videoFile.path !== outputPath && fs.existsSync(videoFile.path)) {
                    fs.unlinkSync(videoFile.path);
                }
                videos.push(`/${outputPath.replace(/\\/g, '/')}`);
            } catch (err) {
                console.error('Error compressing return video:', err);
                videos.push(`/${videoFile.path.replace(/\\/g, '/')}`);
            }
        } else if (req.body.videos) {
            videos = Array.isArray(req.body.videos) ? req.body.videos : JSON.parse(req.body.videos || '[]');
        }

        order.orderStatus = 'Trả hàng/Hoàn tiền';
        order.returnReason = reason || '';
        order.returnImages = images;
        order.returnVideos = videos;
        order.returnStatus = 'pending';
        order.returnCode = 'RT' + Math.floor(100000 + Math.random() * 900000);

        const updatedOrder = await order.save();
        res.status(200).json({ success: true, message: 'Gửi yêu cầu trả hàng thành công', data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
