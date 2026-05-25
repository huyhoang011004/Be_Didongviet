import mongoose from 'mongoose';
import Order from '#order/Order.model.js';
import Product from '#product/Product.model.js';
import Account from '#account/Account.model.js';
import Cart from '#cart/Cart.model.js';

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
                status: order.orderStatus, // Lấy đúng enum tiếng Việt: 'Đang xử lý', 'Đã xác nhận'...
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

            const price = variant
                ? (variant.salePrice || variant.price || 0)
                : (product.price || (Array.isArray(product.variants) && product.variants.length > 0
                    ? (product.variants[0].salePrice || product.variants[0].price || 0)
                    : 0));

            itemsPrice += price * item.qty;
            verifiedItems.push({
                product: product._id,
                variantId: item.variantId || null,
                name: product.name,
                qty: item.qty,
                image: variant?.variantImage || product.featuredImage || product.images?.[0]?.url || '',
                price
            });
        }

        res.status(200).json({
            success: true,
            shippingAddress: defaultShipping, // Trả về object địa chỉ đã bóc tách chi tiết
            orderItems: verifiedItems,
            itemsPrice,
            shippingPrice: itemsPrice > 5000000 ? 0 : 30000,
            totalPrice: itemsPrice
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 1. Tạo đơn hàng & Trừ tồn kho
export const addOrderItems = async (req, res) => {
    // Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu (Nếu lỗi bất kỳ bước nào, toàn bộ sẽ rollback)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            orderItems,
            shippingAddress,
            paymentMethod,
            discountDMember,
            tradeInBonus,
            shippingPrice
        } = req.body;

        if (!orderItems || orderItems.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Đơn hàng trống' });
        }

        // 1. Kiểm tra ngặt nghèo thông tin nhận hàng
        if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.province || !shippingAddress.district || !shippingAddress.ward || !shippingAddress.streetAddress) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin nhận hàng (Tên, Số điện thoại, Tỉnh/thành, Quận/huyện, Phường/xã, Địa chỉ)' });
        }

        let calculatedItemsPrice = 0;
        const finalOrderItems = [];

        // 2. Duyệt qua từng sản phẩm để vừa kiểm tra giá, vừa trừ kho an toàn
        for (const item of orderItems) {
            let updatedProduct = null;
            let variant = null;

            if (item.variantId) {
                updatedProduct = await Product.findOneAndUpdate(
                    { _id: item.product, 'variants._id': item.variantId, 'variants.stock': { $gte: item.qty } },
                    { $inc: { 'variants.$.stock': -item.qty } },
                    { session, new: true }
                );
                if (updatedProduct) {
                    variant = updatedProduct.variants.find(v => String(v._id) === String(item.variantId));
                }
            }

            if (!updatedProduct) {
                updatedProduct = await Product.findOneAndUpdate(
                    { _id: item.product, stock: { $gte: item.qty } },
                    { $inc: { stock: -item.qty } },
                    { session, new: true }
                );
            }

            if (!updatedProduct || (item.variantId && !variant)) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: 'Sản phẩm có ID hoặc biến thể không đủ số lượng trong kho, vui lòng kiểm tra lại!' });
            }

            const price = variant
                ? (variant.salePrice || variant.price || 0)
                : (updatedProduct.price || 0);

            calculatedItemsPrice += price * item.qty;

            finalOrderItems.push({
                product: updatedProduct._id,
                variantId: item.variantId || null,
                name: updatedProduct.name,
                qty: item.qty,
                image: variant?.variantImage || updatedProduct.featuredImage || updatedProduct.images?.[0]?.url || '',
                price
            });
        }

        // 3. Tính toán tổng tiền cuối cùng (Final Price)
        const totalDiscount = (discountDMember || 0) + (tradeInBonus || 0);
        const totalPrice = (calculatedItemsPrice + (shippingPrice || 0)) - totalDiscount;

        // 4. Khởi tạo và tạo đơn hàng mới
        const order = new Order({
            user: req.user._id,
            orderItems: finalOrderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice: calculatedItemsPrice,
            discountDMember,
            tradeInBonus,
            shippingPrice,
            totalPrice: totalPrice < 0 ? 0 : totalPrice, // Đảm bảo không bị âm tiền
        });

        const createdOrder = await order.save({ session });

        // 5. Cập nhật: Nếu mua từ Giỏ hàng thành công, xóa các mặt hàng đó khỏi Cart của user
        const productIds = finalOrderItems.map(item => item.product);
        await Cart.findOneAndUpdate(
            { user: req.user._id },
            { $pull: { items: { product: { $in: productIds } } } },
            { session }
        );

        // Hoàn tất giao dịch
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, data: createdOrder });
    } catch (error) {
        // Có lỗi phát sinh -> Hủy toàn bộ tiến trình, hoàn lại kho tự động ngay lập tức
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Hủy đơn hàng & Hoàn tồn kho
export const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

        // Chỉ được hủy khi đơn hàng "Đang xử lý"
        if (order.orderStatus !== 'Đang xử lý') {
            return res.status(400).json({ message: 'Không thể hủy đơn hàng đã xác nhận hoặc đang giao' });
        }

        order.orderStatus = 'Đã hủy';
        await order.save();

        // HOÀN LẠI TỒN KHO
        const restoreStockPromises = order.orderItems.map(item =>
            Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } })
        );
        await Promise.all(restoreStockPromises);

        res.status(200).json({ success: true, message: 'Đã hủy đơn hàng và hoàn tồn kho' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Lấy tất cả đơn hàng (Dành cho Admin)
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('user', 'id name').sort({ createdAt: -1 });
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
            order.orderStatus = 'Đã hoàn thành';
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
export const trackOrderPublic = async (req, res) => {
    try {
        const { orderId, phone } = req.query;
        const order = await Order.findById(orderId);

        if (order && order.shippingAddress.phone === phone) {
            res.status(200).json({ success: true, status: order.orderStatus, isPaid: order.isPaid });
        } else {
            res.status(404).json({ message: 'Thông tin tra cứu không chính xác' });
        }
    } catch (error) {
        res.status(500).json({ message: 'ID đơn hàng không hợp lệ' });
    }
};