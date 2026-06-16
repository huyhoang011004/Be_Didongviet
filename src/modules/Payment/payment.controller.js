import mongoose from 'mongoose';
import Order from '#order/Order.model.js';
import { createMoMoPayment, verifyMoMoCallback, createVNPayPayment, verifyVNPayCallback } from './payment.service.js';

// ============================================================
// POST /api/v1/payment/momo — Tạo thanh toán MoMo
// ============================================================
export const createMoMoOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Thiếu orderId' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        if (String(order.user) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Đơn hàng không thuộc về bạn' });
        }

        if (order.isPaid) {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán' });
        }

        const amount = Math.round(order.totalPrice);
        const orderInfo = `Thanh toan don hang ${order._id}`;

        const momoRes = await createMoMoPayment({
            orderId: String(order._id),
            amount,
            orderInfo,
        });

        // MoMo trả về payUrl để redirect user
        if (momoRes.resultCode === 0 && momoRes.payUrl) {
            return res.status(200).json({
                success: true,
                data: {
                    payUrl: momoRes.payUrl,
                    deeplink: momoRes.deeplink || null,
                    qrCodeUrl: momoRes.qrCodeUrl || null,
                },
            });
        }

        return res.status(400).json({
            success: false,
            message: momoRes.message || 'Không thể tạo thanh toán MoMo',
            resultCode: momoRes.resultCode,
        });
    } catch (error) {
        console.error('Lỗi tạo thanh toán MoMo:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================
// POST /api/v1/payment/momo/ipn — IPN callback từ MoMo
// ============================================================
export const handleMoMoIPN = async (req, res) => {
    try {
        const body = req.body;

        // Xác thực chữ ký
        const isValidSignature = verifyMoMoCallback(body);
        if (!isValidSignature) {
            console.warn('MoMo IPN: Chữ ký không hợp lệ');
            return res.status(400).json({ message: 'Invalid signature' });
        }

        const { orderId, resultCode, transId } = body;

        // Tìm order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // resultCode === 0 nghĩa là thanh toán thành công
        if (resultCode === 0) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.orderStatus = 'Chờ lấy hàng'; // Thanh toán online → bỏ qua chờ xác nhận
            order.paymentResult = {
                id: String(transId),
                status: 'SUCCESS',
                update_time: new Date().toISOString(),
            };
            await order.save();
        } else {
            order.paymentResult = {
                id: String(transId || ''),
                status: 'FAILED',
                update_time: new Date().toISOString(),
            };
            await order.save();
        }

        return res.status(200).json({ message: 'OK' });
    } catch (error) {
        console.error('Lỗi xử lý MoMo IPN:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ============================================================
// POST /api/v1/payment/vnpay — Tạo thanh toán VNPay
// ============================================================
export const createVNPayOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Thiếu orderId' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        if (String(order.user) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Đơn hàng không thuộc về bạn' });
        }

        if (order.isPaid) {
            return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán' });
        }

        const amount = Math.round(order.totalPrice);
        const orderInfo = `Thanh toan don hang ${order._id}`;
        const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        const { paymentUrl } = createVNPayPayment({
            orderId: String(order._id),
            amount,
            orderInfo,
            ipAddr,
        });

        return res.status(200).json({
            success: true,
            data: { paymentUrl },
        });
    } catch (error) {
        console.error('Lỗi tạo thanh toán VNPay:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================
// GET /api/v1/payment/vnpay/ipn — IPN callback từ VNPay (server-to-server)
// ============================================================
export const handleVNPayIPN = async (req, res) => {
    try {
        const query = req.query;

        // Xác thực chữ ký
        const isValidSignature = verifyVNPayCallback(query);
        if (!isValidSignature) {
            console.warn('VNPay IPN: Chữ ký không hợp lệ');
            return res.status(400).json({ RspCode: '97', Message: 'Invalid Checksum' });
        }

        const orderId = query.vnp_TxnRef;
        const responseCode = query.vnp_ResponseCode;
        const transactionNo = query.vnp_TransactionNo;
        const amount = parseInt(query.vnp_Amount) / 100; // VNPay trả về amount * 100

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ RspCode: '01', Message: 'Order not found' });
        }

        if (order.totalPrice !== amount) {
            return res.status(400).json({ RspCode: '04', Message: 'Invalid Amount' });
        }

        if (order.isPaid) {
            // Đã xử lý rồi, trả về OK cho VNPay
            return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
        }

        // responseCode === '00' nghĩa là thanh toán thành công
        if (responseCode === '00') {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.orderStatus = 'Chờ lấy hàng'; // Thanh toán online → bỏ qua chờ xác nhận
            order.paymentResult = {
                id: String(transactionNo),
                status: 'SUCCESS',
                update_time: new Date().toISOString(),
            };
            await order.save();
        } else {
            order.paymentResult = {
                id: String(transactionNo || ''),
                status: 'FAILED',
                update_time: new Date().toISOString(),
            };
            await order.save();
        }

        return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    } catch (error) {
        console.error('Lỗi xử lý VNPay IPN:', error);
        return res.status(500).json({ RspCode: '99', Message: 'Unknown error' });
    }
};

// ============================================================
// GET /api/v1/payment/vnpay/return — Return URL cho VNPay (user redirect)
// Đồng thời cập nhật DB nếu thanh toán thành công (fallback cho IPN)
// Lưu ý: KHÔNG verify signature ở Return URL vì URL encoding có thể khác
// IPN callback mới là nơi verify signature chính xác
// ============================================================
export const handleVNPayReturn = async (req, res) => {
    try {
        const query = req.query;

        const orderId = query.vnp_TxnRef;
        const responseCode = query.vnp_ResponseCode;
        const transactionNo = query.vnp_TransactionNo;
        const amount = parseInt(query.vnp_Amount) / 100;

        // Nếu thanh toán thành công → cập nhật DB (fallback cho IPN)
        if (responseCode === '00' && orderId) {
            try {
                const order = await Order.findById(orderId);
                if (order && !order.isPaid) {
                    order.isPaid = true;
                    order.paidAt = Date.now();
                    order.orderStatus = 'Chờ lấy hàng';
                    order.paymentResult = {
                        id: String(transactionNo || ''),
                        status: 'SUCCESS',
                        update_time: new Date().toISOString(),
                    };
                    await order.save();
                    console.log(`[VNPay Return] Đã cập nhật đơn hàng ${orderId} thành công`);
                }
            } catch (dbError) {
                console.error('[VNPay Return] Lỗi cập nhật DB:', dbError);
            }
        }

        return res.status(200).json({
            success: responseCode === '00',
            orderId,
            responseCode,
        });
    } catch (error) {
        console.error('Lỗi xử lý VNPay return:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================
// GET /api/v1/payment/momo/return — Return URL cho MoMo (user redirect)
// Đồng thời cập nhật DB nếu thanh toán thành công (fallback cho IPN)
// ============================================================
export const handleMoMoReturn = async (req, res) => {
    try {
        const { orderId, resultCode, message } = req.query;

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Thiếu orderId' });
        }

        // resultCode === '0' nghĩa là thanh toán thành công
        if (resultCode === '0') {
            try {
                const order = await Order.findById(orderId);
                if (order && !order.isPaid) {
                    order.isPaid = true;
                    order.paidAt = Date.now();
                    order.orderStatus = 'Chờ lấy hàng';
                    order.paymentResult = {
                        id: `MOMO_RETURN_${Date.now()}`,
                        status: 'SUCCESS',
                        update_time: new Date().toISOString(),
                    };
                    await order.save();
                    console.log(`[MoMo Return] Đã cập nhật đơn hàng ${orderId} thành công`);
                }
            } catch (dbError) {
                console.error('[MoMo Return] Lỗi cập nhật DB:', dbError);
            }
        }

        return res.status(200).json({
            success: resultCode === '0',
            orderId,
            resultCode,
            message: message || '',
        });
    } catch (error) {
        console.error('Lỗi xử lý MoMo return:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
