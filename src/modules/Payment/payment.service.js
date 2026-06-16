import crypto from 'crypto';
import querystring from 'querystring';

// ============================================================
// CẤU HÌNH MoMo Sandbox
// ============================================================
const MOMO_CONFIG = {
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
    secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/checkout/success',
    ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:5000/api/v1/payment/momo/ipn',
};

// ============================================================
// CẤU HÌNH VNPay Sandbox
// ============================================================
const VNPAY_CONFIG = {
    tmnCode: process.env.VNPAY_TMN_CODE || 'NT4A2R45',
    hashSecret: process.env.VNPAY_HASH_SECRET || '1FTT1PVGT7CMJW6W01NMYPOV7T22TT2O',
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/checkout/success',
    ipnUrl: process.env.VNPAY_IPN_URL || 'http://localhost:5000/api/v1/payment/vnpay/ipn',
};

// ============================================================
// MoMo: Tạo link thanh toán
// ============================================================
export const createMoMoPayment = async ({ orderId, amount, orderInfo }) => {
    const requestId = `${orderId}_${Date.now()}`;
    const extraData = '';
    const requestType = 'payWithMethod'; // payWithMethod: QR code, payWithATM: ATM, payWithCC: Credit Card

    // Tạo chữ ký (signature)
    const rawSignature = [
        `accessKey=${MOMO_CONFIG.accessKey}`,
        `amount=${amount}`,
        `extraData=${extraData}`,
        `ipnUrl=${MOMO_CONFIG.ipnUrl}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo}`,
        `partnerCode=${MOMO_CONFIG.partnerCode}`,
        `redirectUrl=${MOMO_CONFIG.redirectUrl}?orderId=${orderId}&paymentMethod=MOMO&total=${amount}`,
        `requestId=${requestId}`,
        `requestType=${requestType}`,
    ].join('&');

    const signature = crypto
        .createHmac('sha256', MOMO_CONFIG.secretKey)
        .update(rawSignature)
        .digest('hex');

    const body = {
        partnerCode: MOMO_CONFIG.partnerCode,
        partnerName: 'Di Dong Viet',
        storeId: 'DiDongViet',
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl: `${MOMO_CONFIG.redirectUrl}?orderId=${orderId}&paymentMethod=MOMO&total=${amount}`,
        ipnUrl: MOMO_CONFIG.ipnUrl,
        lang: 'vi',
        requestType,
        autoCapture: true,
        extraData,
        signature,
    };

    try {
        const response = await fetch(MOMO_CONFIG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Lỗi gọi MoMo API:', error);
        throw error;
    }
};

// ============================================================
// MoMo: Xác nhận callback (IPN)
// ============================================================
export const verifyMoMoCallback = (body) => {
    const rawSignature = [
        `accessKey=${MOMO_CONFIG.accessKey}`,
        `amount=${body.amount}`,
        `extraData=${body.extraData || ''}`,
        `message=${body.message}`,
        `orderId=${body.orderId}`,
        `orderInfo=${body.orderInfo}`,
        `orderType=${body.orderType}`,
        `partnerCode=${body.partnerCode}`,
        `payType=${body.payType}`,
        `requestId=${body.requestId}`,
        `responseTime=${body.responseTime}`,
        `resultCode=${body.resultCode}`,
        `transId=${body.transId}`,
    ].join('&');

    const signature = crypto
        .createHmac('sha256', MOMO_CONFIG.secretKey)
        .update(rawSignature)
        .digest('hex');

    return signature === body.signature;
};

// ============================================================
// VNPay: Tạo link thanh toán
// ============================================================
export const createVNPayPayment = ({ orderId, amount, orderInfo, ipAddr }) => {
    const date = new Date();
    const createDate = formatVNPayDate(date);
    const expireDate = formatVNPayDate(new Date(date.getTime() + 15 * 60 * 1000)); // 15 phút

    const vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: VNPAY_CONFIG.tmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
        vnp_OrderType: 'other',
        vnp_Amount: amount * 100, // VNPay yêu cầu nhân 100
        vnp_ReturnUrl: `${VNPAY_CONFIG.returnUrl}?orderId=${orderId}&paymentMethod=VNPAY&total=${amount}`,
        vnp_IpAddr: ipAddr || '127.0.0.1',
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
    };

    // Sắp xếp params theo key
    const sortedParams = sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, null, null, {
        encodeURIComponent: (str) => encodeURIComponent(str).replace(/%20/g, '+'),
    });

    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    sortedParams.vnp_SecureHash = signed;

    const paymentUrl = `${VNPAY_CONFIG.url}?${querystring.stringify(sortedParams, null, null, {
        encodeURIComponent: (str) => encodeURIComponent(str).replace(/%20/g, '+'),
    })}`;

    return { paymentUrl, params: sortedParams };
};

// ============================================================
// VNPay: Xác nhận callback (IPN)
// ============================================================
export const verifyVNPayCallback = (query) => {
    const secureHash = query.vnp_SecureHash;
    const params = { ...query };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const sortedParams = sortObject(params);
    const signData = querystring.stringify(sortedParams, null, null, {
        encodeURIComponent: (str) => encodeURIComponent(str).replace(/%20/g, '+'),
    });

    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
};

// ============================================================
// Helper: Format ngày cho VNPay
// ============================================================
function formatVNPayDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// ============================================================
// Helper: Sắp xếp object theo key
// ============================================================
function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        sorted[key] = obj[key];
    }
    return sorted;
}