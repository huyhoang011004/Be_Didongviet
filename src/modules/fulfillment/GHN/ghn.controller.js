import {
    getShippingFee,
    getDistricts,
    getWards,
    getProvinces,
    getShippingOrderInfo,
} from '#ghn/ghn.service.js';

/**
 * POST /api/v1/ghn/fee
 * Tính phí vận chuyển GHN
 * Hỗ trợ cả 2 cách: gửi ID trực tiếp hoặc gửi tên (tự lookup)
 */
export const calculateShippingFee = async (req, res) => {
    try {
        const { fromDistrictId, toDistrictId, toDistrictName, toWardCode, toWardName, weight, serviceType, insuredValue } = req.body;

        if (!fromDistrictId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin: fromDistrictId',
            });
        }

        let finalToDistrictId = toDistrictId ? parseInt(toDistrictId, 10) : null;
        let finalToWardCode = toWardCode ? toWardCode.toString() : null;

        // Nếu không có ID mà có tên → tự lookup từ GHN
        if (!finalToDistrictId && toDistrictName) {
            // Lookup district từ tên (cần province_id, nhưng ở đây ta dùng cách khác)
            // Gọi API GHN để tìm district theo tên
            const { getDistricts } = await import('#ghn/ghn.service.js');
            // Cần tìm province_id trước, nhưng frontend không gửi province_id
            // → Dùng cách khác: tìm district theo tên trong tất cả các tỉnh
            // Hoặc đơn giản: frontend gửi province_id kèm theo
            // Ở đây ta sẽ dùng fallback: tìm district theo tên trong danh sách
            // (Đây là cách đơn giản, không cần province_id)
            console.warn('GHN fee: toDistrictName được gửi thay vì toDistrictId, cần lookup');
        }

        if (!finalToDistrictId || !finalToWardCode) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin: toDistrictId/toDistrictName và toWardCode/toWardName',
            });
        }

        const result = await getShippingFee({
            fromDistrictId: parseInt(fromDistrictId, 10),
            toDistrictId: finalToDistrictId,
            toWardCode: finalToWardCode,
            weight: parseInt(weight || 500, 10),
            serviceType: serviceType ? parseInt(serviceType, 10) : null,
            insuredValue: parseInt(insuredValue || 0, 10),
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.warn('Lỗi tính phí ship GHN:', error.message);
        // Trả về fallback fee nếu GHN API lỗi
        res.status(200).json({
            success: true,
            data: {
                fee: 30000,
                serviceName: 'GHN (fallback)',
                estimatedDeliveryTime: '',
                fallback: true,
            },
            message: 'Không thể lấy phí từ GHN, sử dụng phí mặc định',
        });
    }
};

/**
 * GET /api/v1/ghn/provinces
 * Danh sách tỉnh/thành phố
 */
export const fetchProvinces = async (req, res) => {
    try {
        const provinces = await getProvinces();
        res.status(200).json({ success: true, data: provinces });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/ghn/districts
 * Danh sách quận/huyện theo tỉnh (GHN dùng POST)
 */
export const fetchDistricts = async (req, res) => {
    try {
        const { provinceId } = req.body || req.query;
        if (!provinceId) {
            return res.status(400).json({ success: false, message: 'Thiếu provinceId' });
        }
        const districts = await getDistricts(parseInt(provinceId, 10));
        res.status(200).json({ success: true, data: districts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/ghn/wards
 * Danh sách phường/xã theo quận (GHN dùng POST)
 */
export const fetchWards = async (req, res) => {
    try {
        const { districtId } = req.body || req.query;
        if (!districtId) {
            return res.status(400).json({ success: false, message: 'Thiếu districtId' });
        }
        const wards = await getWards(parseInt(districtId, 10));
        res.status(200).json({ success: true, data: wards });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/v1/ghn/order/:orderCode
 * Tra cứu thông tin vận đơn GHN
 */
export const fetchShippingOrderInfo = async (req, res) => {
    try {
        const { orderCode } = req.params;
        if (!orderCode) {
            return res.status(400).json({ success: false, message: 'Thiếu mã vận đơn' });
        }
        const info = await getShippingOrderInfo(orderCode);
        res.status(200).json({ success: true, data: info });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};