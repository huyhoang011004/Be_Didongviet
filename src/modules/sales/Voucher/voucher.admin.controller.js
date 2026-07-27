import Voucher from '#voucher/Voucher.model.js';

export const getAllVouchersAdmin = async (req, res) => {
    try {
        const vouchers = await Voucher.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: vouchers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createVoucher = async (req, res) => {
    try {
        const body = {
            ...req.body,
            code: req.body.code ? req.body.code.toUpperCase() : undefined
        };

        const existingVoucher = await Voucher.findOne({ code: body.code });
        if (existingVoucher) {
            return res.status(400).json({ message: 'Mã voucher đã tồn tại' });
        }

        const voucher = new Voucher(body);
        const createdVoucher = await voucher.save();

        res.status(201).json({ success: true, data: createdVoucher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json({ message: 'Không tìm thấy voucher' });
        }

        if (req.body.code) {
            req.body.code = req.body.code.toUpperCase();
        }

        Object.assign(voucher, req.body);
        const updatedVoucher = await voucher.save();

        res.status(200).json({ success: true, data: updatedVoucher });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json({ message: 'Không tìm thấy voucher' });
        }

        await voucher.deleteOne();
        res.status(200).json({ success: true, message: 'Đã xóa voucher' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
