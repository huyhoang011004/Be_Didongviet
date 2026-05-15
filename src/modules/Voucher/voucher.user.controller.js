import Voucher from '#voucher/Voucher.model.js';

export const getAllVouchers = async (req, res) => {
    try {
        const query = {
            isActive: true,
            expiryDate: { $gte: new Date() }
        };

        if (req.query.isHSSVOnly === 'true') {
            query.isHSSVOnly = true;
        }

        const vouchers = await Voucher.find(query).sort({ startDate: 1 });
        res.status(200).json({ success: true, data: vouchers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getVoucherByCode = async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();

        const voucher = await Voucher.findOne({
            code,
            isActive: true,
            expiryDate: { $gte: new Date() }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Voucher không tồn tại hoặc đã hết hạn' });
        }

        res.status(200).json({ success: true, data: voucher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
