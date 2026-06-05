
exports.getCurrentFlashSale = async (req, res) => {
    try {
        const now = new Date();
        const currentHour = now.getHours();

        // 1. Tìm chiến dịch Flash Sale hợp lệ về ngày X đến ngày Y
        const activeSale = await FlashSale.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        }).populate('products.product', 'name images price'); // Lấy thêm thông tin gốc của sản phẩm

        if (!activeSale) {
            return res.status(200).json({ message: "Không có chương trình Flash Sale nào hôm nay", data: null });
        }

        // 2. Kiểm tra xem giờ hiện tại có nằm trong khung giờ sale không
        // Ví dụ slot 9h, thời lượng 60p -> Hợp lệ từ 09:00:00 đến 09:59:59
        const activeSlot = activeSale.timeSlots.find(slot => {
            return currentHour >= slot && currentHour < (slot + (activeSale.duration / 60));
        });

        if (activeSlot === undefined) {
            return res.status(200).json({ message: "Chưa đến khung giờ Flash Sale tiếp theo", data: null, nextSlot: activeSale.timeSlots });
        }

        res.status(200).json({
            message: "Lấy dữ liệu Flash Sale thành công",
            slot: activeSlot,
            products: activeSale.products
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};