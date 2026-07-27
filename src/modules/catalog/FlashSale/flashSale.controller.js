import FlashSale from '#flashSale/FlashSale.model.js';

export const getCurrentFlashSale = async (req, res) => {
    try {
        const now = new Date();
        const currentHour = now.getHours();

        // 1. Tìm chiến dịch Flash Sale hợp lệ về ngày
        const activeSale = await FlashSale.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        }).populate({
            path: 'products.product',
            select: 'name images variants brand ratingsAverage ratingsCount tradeInBonus slug isActive',
            match: { isActive: true }
        });

        if (!activeSale) {
            return res.status(200).json({
                success: true,
                message: "Không có chương trình Flash Sale nào hôm nay",
                data: null
            });
        }

        // Lọc bỏ những sản phẩm không tìm thấy hoặc bị set null do filter match isActive: true
        const activeProducts = activeSale.products.filter(p => p.product !== null);

        // 2. Kiểm tra xem giờ hiện tại có nằm trong khung giờ sale không
        const activeSlot = activeSale.timeSlots.find(slot => {
            return currentHour >= slot && currentHour < (slot + (activeSale.duration / 60));
        });

        if (activeSlot === undefined) {
            // Tìm slot tiếp theo trong ngày hoặc ngày hôm sau
            const nextSlots = activeSale.timeSlots.filter(slot => slot > currentHour).sort((a, b) => a - b);
            const nextSlot = nextSlots.length > 0 ? nextSlots[0] : activeSale.timeSlots[0]; // Nếu hết slot trong ngày thì lấy slot đầu ngày hôm sau

            return res.status(200).json({
                success: true,
                message: "Chưa đến khung giờ Flash Sale tiếp theo",
                data: {
                    name: activeSale.name,
                    nextSlot: nextSlot,
                    timeSlots: activeSale.timeSlots,
                    duration: activeSale.duration,
                    isNextDay: nextSlots.length === 0,
                    products: []
                }
            });
        }

        // Tính thời gian kết thúc của slot hiện tại
        const startTime = new Date(now);
        startTime.setHours(activeSlot, 0, 0, 0);
        const endTime = new Date(startTime.getTime() + activeSale.duration * 60 * 1000);

        res.status(200).json({
            success: true,
            message: "Lấy dữ liệu Flash Sale thành công",
            data: {
                _id: activeSale._id,
                name: activeSale.name,
                slot: activeSlot,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration: activeSale.duration,
                products: activeProducts
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};