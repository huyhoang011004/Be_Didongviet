import Order from '#order/Order.model.js';
import Product from '#product/Product.model.js';

// 1. Tạo đơn hàng & Trừ tồn kho
export const addOrderItems = async (req, res) => {
    try {
        const { orderItems, ...otherData } = req.body;

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ message: 'Giỏ hàng trống' });
        }

        // Kiểm tra tồn kho trước khi tạo đơn
        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (product.stock < item.qty) {
                return res.status(400).json({ message: `Sản phẩm ${product.name} đã hết hàng hoặc không đủ số lượng` });
            }
        }

        const order = new Order({
            user: req.user._id,
            orderItems,
            ...otherData
        });

        const createdOrder = await order.save();

        // TRỪ TỒN KHO SAU KHI ĐẶT HÀNG THÀNH CÔNG
        const updateStockPromises = orderItems.map(item =>
            Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } })
        );
        await Promise.all(updateStockPromises);

        res.status(201).json({ success: true, data: createdOrder });
    } catch (error) {
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