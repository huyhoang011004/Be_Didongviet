/**
 * GHN Service - Tích hợp API Giao Hàng Nhanh
 * Docs: https://docs.giaohangtietkiem.vn/
 */

const GHN_API_URL = process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn/shiip/public-api';
const GHN_TOKEN = process.env.GHN_TOKEN || '';
const GHN_SHOP_ID = process.env.GHN_SHOP_ID || '';

/**
 * Hàm gọi API GHN chung
 * @param {string} endpoint - Path endpoint (VD: '/shipping-order/fee')
 * @param {string} method - HTTP method
 * @param {object} body - Request body (optional)
 * @returns {Promise<object>}
 */
const callGHNAPI = async (endpoint, method = 'GET', body = null) => {
    const url = `${GHN_API_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        'Token': GHN_TOKEN,
        'ShopId': GHN_SHOP_ID,
    };

    const options = {
        method,
        headers,
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (data.code !== 200) {
        throw new Error(data.message || `Lỗi GHN API: ${endpoint}`);
    }

    return data;
};

/**
 * Tính phí vận chuyển
 * @param {object} params
 * @param {number} params.fromDistrictId - ID quận/huyện nơi lấy hàng
 * @param {number} params.toDistrictId - ID quận/huyện nơi giao hàng
 * @param {string} params.toWardCode - Mã phường/xã nơi giao hàng
 * @param {number} params.weight - Trọng lượng (gram)
 * @param {number} params.serviceType - Loại dịch vụ (2: bike, 3: truck)
 * @param {number} params.insuredValue - Giá trị bảo hiểm (VND)
 * @returns {Promise<{fee: number, serviceId: number, estimatedDeliveryTime: string}>}
 */
export const getShippingFee = async ({
    fromDistrictId,
    toDistrictId,
    toWardCode,
    weight = 500,
    serviceType = null,
    insuredValue = 0,
}) => {
    // Lấy danh sách dịch vụ khả dụng trước
    const servicesData = await callGHNAPI(
        `/shipping-order/available-services?shop_id=${GHN_SHOP_ID}&from_district=${fromDistrictId}&to_district=${toDistrictId}`
    );

    const availableServices = servicesData.data || [];
    if (availableServices.length === 0) {
        throw new Error('Không có dịch vụ vận chuyển khả dụng cho tuyến này');
    }

    // Chọn dịch vụ phù hợp
    let selectedService = availableServices[0];
    if (serviceType) {
        const match = availableServices.find(s => s.service_type_id === serviceType);
        if (match) selectedService = match;
    }

    // Tính phí
    const feeData = await callGHNAPI(
        `/shipping-order/fee?service_id=${selectedService.service_id}&from_district=${fromDistrictId}&to_district=${toDistrictId}&to_ward=${toWardCode}&weight=${weight}&insurance_value=${insuredValue}`
    );

    const feeInfo = feeData.data || {};

    return {
        fee: feeInfo.total || 0,
        serviceId: selectedService.service_id,
        serviceName: selectedService.short_name || '',
        estimatedDeliveryTime: feeInfo.leadtime
            ? new Date(feeInfo.leadtime * 1000).toISOString()
            : '',
    };
};

/**
 * Tạo vận đơn GHN
 * @param {object} order - Đối tượng Order từ DB
 * @param {object} branch - Đối tượng Branch từ DB (chi nhánh lấy hàng)
 * @returns {Promise<{success: boolean, orderCode: string, orderId: string}>}
 */
export const createShippingOrder = async (order, branch) => {
    // Tính tổng trọng lượng ước tính (mỗi sản phẩm ~500g)
    const totalWeight = order.orderItems.reduce((sum, item) => sum + (item.qty * 500), 0);

    // Tính tổng giá trị đơn hàng cho bảo hiểm
    const totalValue = order.totalPrice || 0;

    // Chuẩn bị payload theo format GHN API
    const payload = {
        shop_id: parseInt(GHN_SHOP_ID, 10),
        required_note: 'KHONG_GIAO_HANG',
        to_name: order.shippingAddress.fullName,
        to_phone: order.shippingAddress.phone,
        to_address: order.shippingAddress.streetAddress,
        to_ward_name: order.shippingAddress.ward,
        to_district_name: order.shippingAddress.district,
        to_province_name: order.shippingAddress.province,

        // Thông tin người gửi (từ branch)
        from_name: branch.ghnFromName || branch.name || 'Di Động Việt',
        from_phone: branch.ghnFromPhone || branch.phone || '',
        from_address: branch.address || '',
        from_ward_name: '',
        from_district_name: '',
        from_province_name: '',

        // Thông tin vận đơn
        weight: totalWeight,
        service_id: 2, // Dịch vụ mặc định
        payment_type: 1, // 1: Người gửi trả, 2: Người nhận trả
        insurance_value: totalValue,
        note: `Đơn hàng ${order._id}`,

        // Chi tiết kiện hàng
        items: order.orderItems.map(item => ({
            name: item.name,
            quantity: item.qty,
            price: item.price,
            weight: 500, // ước tính mỗi SP 500g
        })),
    };

    const data = await callGHNAPI('/shipping-order/create', 'POST', payload);

    return {
        success: true,
        orderCode: data.data?.order_code || '',
        orderId: data.data?.order_id?.toString() || '',
        expectedDeliveryTime: data.data?.expected_delivery_time || '',
    };
};

/**
 * Helper: lấy field PascalCase hoặc snake_case từ object GHN API
 * GHN API mới trả PascalCase (DistrictID, DistrictName), cũ trả snake_case
 */
const getField = (obj, pascalKey, snakeKey, fallback = '') => {
    return obj[pascalKey] ?? obj[snakeKey] ?? fallback;
};

/**
 * Lookup quận/huyện theo tỉnh thành
 * API GHN dùng POST với body { province_id }
 * @param {number} provinceId - ID tỉnh/thành phố trên GHN
 * @returns {Promise<Array>}
 */
export const getDistricts = async (provinceId) => {
    const data = await callGHNAPI('/master-data/district', 'POST', { province_id: provinceId });
    return (data.data || []).map(d => ({
        districtId: getField(d, 'DistrictID', 'district_id'),
        districtName: getField(d, 'DistrictName', 'district_name'),
        provinceId: getField(d, 'ProvinceID', 'province_id'),
        type: getField(d, 'Type', 'type'),
    }));
};

/**
 * Lookup phường/xã theo quận/huyện
 * API GHN dùng POST với query param district_id và body { district_id }
 * @param {number} districtId - ID quận/huyện trên GHN
 * @returns {Promise<Array>}
 */
export const getWards = async (districtId) => {
    const data = await callGHNAPI(`/master-data/ward?district_id=${districtId}`, 'POST', { district_id: districtId });
    return (data.data || []).map(w => ({
        wardCode: getField(w, 'WardCode', 'ward_code'),
        wardName: getField(w, 'WardName', 'ward_name'),
        districtId: getField(w, 'DistrictID', 'district_id'),
    }));
};

/**
 * Lookup tỉnh/thành phố
 * @returns {Promise<Array>}
 */
export const getProvinces = async () => {
    const data = await callGHNAPI('/master-data/province');
    return (data.data || []).map(p => ({
        provinceId: getField(p, 'ProvinceID', 'province_id'),
        provinceName: getField(p, 'ProvinceName', 'province_name'),
    }));
};

/**
 * Tra cứu mã vận đơn GHN
 * @param {string} orderCode - Mã vận đơn GHN
 * @returns {Promise<object>}
 */
export const getShippingOrderInfo = async (orderCode) => {
    const data = await callGHNAPI(`/v2/shipping-order/detail?order_code=${orderCode}`);
    return data.data || null;
};

export default {
    getShippingFee,
    createShippingOrder,
    getDistricts,
    getWards,
    getProvinces,
    getShippingOrderInfo,
};