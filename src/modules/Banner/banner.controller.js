import Banner from './Banner.model.js';

export const getAllBanners = async (req, res) => {
    try {
        const query = {};
        if (req.query.isActive) {
            query.isActive = req.query.isActive === 'true';
        }
        if (req.query.position) {
            query.position = req.query.position;
        }

        const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, data: banners });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBannerById = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner không tồn tại' });
        }
        res.status(200).json({ success: true, data: banner });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createBanner = async (req, res) => {
    try {
        const { title, imageUrl, link, position, isActive, order } = req.body;

        const newBanner = new Banner({
            title,
            imageUrl,
            link,
            position,
            isActive,
            order
        });

        await newBanner.save();
        res.status(201).json({ success: true, message: 'Tạo banner thành công', data: newBanner });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateBanner = async (req, res) => {
    try {
        const { title, imageUrl, link, position, isActive, order } = req.body;

        const banner = await Banner.findByIdAndUpdate(
            req.params.id,
            { title, imageUrl, link, position, isActive, order },
            { new: true, runValidators: true }
        );

        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner không tồn tại' });
        }

        res.status(200).json({ success: true, message: 'Cập nhật banner thành công', data: banner });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner không tồn tại' });
        }
        res.status(200).json({ success: true, message: 'Xóa banner thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
