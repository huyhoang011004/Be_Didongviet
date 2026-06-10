import mongoose from 'mongoose';
import Order from '#order/Order.model.js';
import Product from '#product/Product.model.js';
import Inventory from '#inventory/Inventory.model.js';

/**
 * Tính khoảng thời gian dựa trên period
 */
const getDateRange = (period) => {
    const now = new Date();
    let startDate;

    switch (period) {
        case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate: now };
};

/**
 * Lấy dữ liệu thống kê doanh thu đa chiều
 * Lọc theo thời điểm hoàn thành giao vận (deliveredAt)
 */
export const getAnalyticsData = async (period = 'month', branchId = null, startDateStr = null, endDateStr = null) => {
    let startDate, endDate;

    // ĐỒNG BỘ: Sửa lại cách khởi tạo Date giống hệt hàm chart bên trên
    if (startDateStr && endDateStr) {
        startDate = new Date(`${startDateStr}T00:00:00`);
        endDate = new Date(`${endDateStr}T23:59:59.999`);
    } else {
        const range = getDateRange(period);
        startDate = range.startDate;
        endDate = range.endDate;
    }

    const matchStage = {
        orderStatus: 'Đã giao',
        deliveredAt: { $gte: startDate, $lte: endDate },
        isDelivered: true
    };

    if (branchId) {
        matchStage.branch = new mongoose.Types.ObjectId(branchId);
    }

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$totalPrice' },
                totalOrders: { $sum: 1 },
                totalProductsSold: { $sum: { $sum: '$orderItems.qty' } },
                totalProfit: {
                    $sum: {
                        $sum: {
                            $map: {
                                input: '$orderItems',
                                as: 'item',
                                in: {
                                    $multiply: [
                                        { $subtract: ['$$item.price', { $ifNull: ['$$item.importPrice', 0] }] },
                                        '$$item.qty'
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        }
    ];

    const result = await Order.aggregate(pipeline);

    if (result.length === 0) {
        return {
            totalRevenue: 0,
            totalOrders: 0,
            totalProductsSold: 0,
            totalProfit: 0,
            avgOrderValue: 0
        };
    }

    const data = result[0];
    return {
        totalRevenue: data.totalRevenue || 0,
        totalOrders: data.totalOrders || 0,
        totalProductsSold: data.totalProductsSold || 0,
        totalProfit: data.totalProfit || 0,
        avgOrderValue: data.totalOrders > 0 ? Math.round(data.totalRevenue / data.totalOrders) : 0
    };
};

/**
 * Lấy dữ liệu biểu đồ theo khoảng thời gian
 * day → granularity theo giờ
 * week/month → granularity theo ngày
 * year → granularity theo tháng
 * Lọc theo thời điểm hoàn thành giao vận (deliveredAt)
 */
export const getChartData = async (period = 'month', branchId = null, startDateStr = null, endDateStr = null) => {
    let startDate, endDate, granularity;

    if (startDateStr && endDateStr) {
        startDate = new Date(`${startDateStr}T00:00:00`);
        endDate = new Date(`${endDateStr}T23:59:59.999`);
    } else {
        const range = getDateRange(period);
        startDate = range.startDate;
        endDate = range.endDate;
    }

    // Xác định granularity dựa trên period hoặc khoảng cách ngày
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
        granularity = 'hour'; // Theo giờ
    } else if (diffDays <= 60) {
        granularity = 'day'; // Theo ngày
    } else {
        granularity = 'month'; // Theo tháng
    }

    const matchStage = {
        orderStatus: 'Đã giao',
        deliveredAt: { $gte: startDate, $lte: endDate },
        isDelivered: true
    };

    if (branchId) {
        matchStage.branch = new mongoose.Types.ObjectId(branchId);
    }

    // Xây dựng groupId theo granularity — dùng timezone '+07:00' cho giờ Việt Nam
    let groupId;
    if (granularity === 'hour') {
        groupId = {
            year: { $year: { date: '$deliveredAt', timezone: '+07:00' } },
            month: { $month: { date: '$deliveredAt', timezone: '+07:00' } },
            day: { $dayOfMonth: { date: '$deliveredAt', timezone: '+07:00' } },
            hour: { $hour: { date: '$deliveredAt', timezone: '+07:00' } }
        };
    } else if (granularity === 'day') {
        groupId = {
            year: { $year: { date: '$deliveredAt', timezone: '+07:00' } },
            month: { $month: { date: '$deliveredAt', timezone: '+07:00' } },
            day: { $dayOfMonth: { date: '$deliveredAt', timezone: '+07:00' } }
        };
    } else {
        groupId = {
            year: { $year: { date: '$deliveredAt', timezone: '+07:00' } },
            month: { $month: { date: '$deliveredAt', timezone: '+07:00' } }
        };
    }

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: groupId,
                totalRevenue: { $sum: '$totalPrice' },
                totalOrders: { $sum: 1 },
                totalProductsSold: { $sum: { $sum: '$orderItems.qty' } },
                totalProfit: {
                    $sum: {
                        $sum: {
                            $map: {
                                input: '$orderItems',
                                as: 'item',
                                in: {
                                    $multiply: [
                                        { $subtract: ['$$item.price', { $ifNull: ['$$item.importPrice', 0] }] },
                                        '$$item.qty'
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ];

    const result = await Order.aggregate(pipeline);

    // Format kết quả
    const chartData = result.map(item => {
        let label, dateObj;
        if (granularity === 'hour') {
            label = `${String(item._id.hour).padStart(2, '0')}:00`;
            dateObj = new Date(item._id.year, item._id.month - 1, item._id.day, item._id.hour);
        } else if (granularity === 'day') {
            label = `Ngày ${item._id.day}/${item._id.month}`;
            dateObj = new Date(item._id.year, item._id.month - 1, item._id.day);
        } else {
            label = `Tháng ${item._id.month}/${item._id.year}`;
            dateObj = new Date(item._id.year, item._id.month - 1, 1);
        }

        const avgOrderValue = item.totalOrders > 0 ? Math.round(item.totalRevenue / item.totalOrders) : 0;

        return {
            label,
            date: dateObj.toISOString(),
            totalRevenue: item.totalRevenue || 0,
            totalProfit: item.totalProfit || 0,
            totalOrders: item.totalOrders || 0,
            totalProductsSold: item.totalProductsSold || 0,
            avgOrderValue
        };
    });

    return { chartData, granularity };
};

/**
 * Lấy tổng quan trạng thái đơn hàng
 */
export const getOrderStatusSummary = async (branchId = null) => {
    const matchStage = {};
    if (branchId) {
        matchStage.branch = new mongoose.Types.ObjectId(branchId);
    }

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: '$orderStatus',
                count: { $sum: 1 }
            }
        }
    ];

    const result = await Order.aggregate(pipeline);

    const summary = {
        'Chờ xác nhận': 0,
        'Chờ lấy hàng': 0,
        'Đang giao': 0,
        'Đã giao': 0,
        'Đã hủy': 0,
        'Trả hàng/Hoàn tiền': 0
    };

    result.forEach(item => {
        if (summary[item._id] !== undefined) {
            summary[item._id] = item.count;
        }
    });

    return summary;
};

/**
 * Lấy danh sách sản phẩm sắp cháy hàng (low stock)
 */
export const getLowStockProducts = async (threshold = 5, limit = 5) => {
    const pipeline = [
        { $match: { stock: { $lte: threshold }, stock: { $gt: 0 } } },
        { $sort: { stock: 1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        {
            $lookup: {
                from: 'branches',
                localField: 'branch',
                foreignField: '_id',
                as: 'branchInfo'
            }
        },
        {
            $addFields: {
                productName: { $ifNull: [{ $arrayElemAt: ['$productInfo.name', 0] }, 'Unknown'] },
                productImage: { $ifNull: [{ $arrayElemAt: ['$productInfo.images.url', 0] }, null] },
                branchName: { $ifNull: [{ $arrayElemAt: ['$branchInfo.name', 0] }, 'Unknown'] }
            }
        },
        {
            $project: {
                productInfo: 0,
                branchInfo: 0
            }
        }
    ];

    const result = await Inventory.aggregate(pipeline);
    return result;
};

/**
 * Lấy danh sách tồn lâu ngày (hơn X ngày không cập nhật)
 */
export const getOldStockProducts = async (days = 60, limit = 5) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const pipeline = [
        { $match: { updatedAt: { $lte: cutoffDate }, stock: { $gt: 0 } } },
        { $sort: { updatedAt: 1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        {
            $addFields: {
                productName: { $ifNull: [{ $arrayElemAt: ['$productInfo.name', 0] }, 'Unknown'] },
                daysInStock: {
                    $floor: {
                        $divide: [
                            { $subtract: [new Date(), '$updatedAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        },
        {
            $project: {
                productInfo: 0
            }
        }
    ];

    const result = await Inventory.aggregate(pipeline);
    return result;
};

/**
 * Bảng xếp hạng chi nhánh theo KPI (doanh số)
 * Lọc theo thời điểm hoàn thành giao vận (deliveredAt)
 */
export const getBranchRanking = async (period = 'month', limit = 10, startDateStr = null, endDateStr = null) => {
    let startDate, endDate;
    if (startDateStr && endDateStr) {
        startDate = new Date(`${startDateStr}T00:00:00`);
        endDate = new Date(`${endDateStr}T23:59:59.999`);
    } else {
        const range = getDateRange(period);
        startDate = range.startDate;
        endDate = range.endDate;
    }

    const pipeline = [
        {
            $match: {
                orderStatus: 'Đã giao',
                deliveredAt: { $gte: startDate, $lte: endDate },
                isDelivered: true
            }
        },
        {
            $group: {
                _id: '$branch',
                totalRevenue: { $sum: '$totalPrice' },
                totalOrders: { $sum: 1 },
                totalProductsSold: { $sum: { $sum: '$orderItems.qty' } }
            }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'branches',
                localField: '_id',
                foreignField: '_id',
                as: 'branchInfo'
            }
        },
        {
            $addFields: {
                branchName: { $ifNull: [{ $arrayElemAt: ['$branchInfo.name', 0] }, 'Unknown'] },
                kpiPercent: 0
            }
        },
        {
            $project: {
                branchInfo: 0
            }
        }
    ];

    const result = await Order.aggregate(pipeline);

    // Tính KPI dựa trên chi nhánh có doanh thu cao nhất
    if (result.length > 0) {
        const maxRevenue = result[0].totalRevenue;
        result.forEach(item => {
            item.kpiPercent = maxRevenue > 0 ? Math.round((item.totalRevenue / maxRevenue) * 100) : 0;
        });
    }

    return result;
};

/**
 * Dashboard Overview - Tổng hợp dữ liệu cho Admin Dashboard
 * Bao gồm: KPI, biểu đồ kênh, trạng thái kho, log realtime, top sales, top chi nhánh
 */
export const getDashboardOverview = async () => {
    const Voucher = (await import('#voucher/Voucher.model.js')).default;
    const Branch = (await import('#branch/Branch.model.js')).default;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setMilliseconds(-1);

    // --- 1. KPI Stats ---
    // Đơn hôm nay (tất cả trạng thái)
    const todayOrdersAgg = await Order.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Đã hủy'] }, 1, 0] } },
                revenue: {
                    $sum: {
                        $cond: [
                            { $and: [{ $eq: ['$orderStatus', 'Đã giao'] }, { $eq: ['$isDelivered', true] }] },
                            '$totalPrice',
                            0
                        ]
                    }
                },
                voucherCount: { $sum: { $cond: [{ $ne: ['$appliedVoucher', null] }, 1, 0] } },
                vouchers: { $push: '$appliedVoucher' }
            }
        }
    ]);

    // Đơn hôm qua
    const yesterdayOrdersAgg = await Order.aggregate([
        { $match: { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Đã hủy'] }, 1, 0] } }
            }
        }
    ]);

    // Top voucher hôm nay
    const topVoucherAgg = await Order.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd }, appliedVoucher: { $ne: null, $ne: '' } } },
        { $group: { _id: '$appliedVoucher', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
    ]);

    const todayData = todayOrdersAgg[0] || { total: 0, cancelled: 0, revenue: 0, voucherCount: 0, vouchers: [] };
    const yesterdayData = yesterdayOrdersAgg[0] || { total: 0, cancelled: 0 };

    const newOrdersToday = todayData.total || 0;
    const yesterdayOrders = yesterdayData.total || 0;
    const orderGrowthRate = yesterdayOrders > 0 ? Math.round(((newOrdersToday - yesterdayOrders) / yesterdayOrders) * 100) : newOrdersToday > 0 ? 100 : 0;

    const realtimeRevenue = todayData.revenue || 0;
    const dailyTarget = 1000000000; // 1 tỷ VND mục tiêu mỗi ngày
    const targetProgress = Math.min(Math.round((realtimeRevenue / dailyTarget) * 100), 100);

    const cancellationRate = newOrdersToday > 0 ? Math.round(((todayData.cancelled || 0) / newOrdersToday) * 100 * 10) / 10 : 0;
    const yesterdayCancellation = yesterdayData.total > 0 ? Math.round(((yesterdayData.cancelled || 0) / yesterdayData.total) * 100 * 10) / 10 : 0;
    const cancellationGrowthRate = yesterdayCancellation > 0
        ? Math.round(((cancellationRate - yesterdayCancellation) / yesterdayCancellation) * 100)
        : cancellationRate > 0 ? 100 : 0;

    const voucherScans = todayData.voucherCount || 0;
    const topVoucherCode = topVoucherAgg.length > 0 ? topVoucherAgg[0]._id : 'Chưa có';

    const kpis = {
        newOrdersToday,
        orderGrowthRate,
        realtimeRevenue,
        targetProgress,
        cancellationRate,
        cancellationGrowthRate,
        voucherScans,
        topVoucherCode
    };

    // --- 2. Channels (Tỷ lệ đơn hàng theo kênh thanh toán) ---
    const channelsAgg = await Order.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 } } }
    ]);

    const totalOrdersToday = channelsAgg.reduce((sum, c) => sum + c.count, 0) || 1;
    const channelColorMap = {
        'COD': '#10b981',
        'VNPAY': '#3b82f6',
        'Trả góp 0%': '#f59e0b'
    };
    const channels = channelsAgg.map(c => ({
        name: c._id,
        value: Math.round((c.count / totalOrdersToday) * 100 * 10) / 10,
        color: channelColorMap[c._id] || '#6b7280'
    }));
    // Đảm bảo có đủ 3 kênh
    ['COD', 'VNPAY', 'Trả góp 0%'].forEach(method => {
        if (!channels.find(c => c.name === method)) {
            channels.push({ name: method, value: 0, color: channelColorMap[method] });
        }
    });

    // --- 3. Stock Status (Sức khỏe trạng thái kho) ---
    const stockAgg = await Inventory.aggregate([
        {
            $group: {
                _id: null,
                inStock: { $sum: { $cond: [{ $gt: ['$stock', 5] }, 1, 0] } },
                lowStock: { $sum: { $cond: [{ $and: [{ $gte: ['$stock', 1] }, { $lte: ['$stock', 5] }] }, 1, 0] } },
                outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } }
            }
        }
    ]);

    // Tồn lâu ngày (updatedAt > 60 ngày)
    const oldStockThreshold = new Date(now);
    oldStockThreshold.setDate(oldStockThreshold.getDate() - 60);
    const oldStockCount = await Inventory.countDocuments({ updatedAt: { $lte: oldStockThreshold }, stock: { $gt: 0 } });

    const stockData = stockAgg[0] || { inStock: 0, lowStock: 0, outOfStock: 0 };
    const totalStock = stockData.inStock + stockData.lowStock + stockData.outOfStock + oldStockCount || 1;

    const stockStatus = [
        { name: 'Còn hàng', value: Math.round((stockData.inStock / totalStock) * 100 * 10) / 10, color: '#10b981' },
        { name: 'Sắp hết', value: Math.round((stockData.lowStock / totalStock) * 100 * 10) / 10, color: '#f59e0b' },
        { name: 'Hết hàng', value: Math.round((stockData.outOfStock / totalStock) * 100 * 10) / 10, color: '#ef4444' },
        { name: 'Tồn lâu ngày', value: Math.round((oldStockCount / totalStock) * 100 * 10) / 10, color: '#8b5cf6' }
    ];

    // --- 4. Logs (Real-time Feed) - 8 log gần nhất ---
    const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name')
        .lean();

    const lowStockItems = await Inventory.aggregate([
        { $match: { stock: { $gt: 0, $lte: 5 } } },
        { $sort: { stock: 1 } },
        { $limit: 3 },
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        {
            $addFields: {
                productName: { $ifNull: [{ $arrayElemAt: ['$productInfo.name', 0] }, 'Unknown'] }
            }
        },
        { $project: { productInfo: 0 } }
    ]);

    // Voucher sắp hết hạn (trong vòng 3 ngày tới)
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const expiringVouchers = await Voucher.find({
        isActive: true,
        expiryDate: { $gte: now, $lte: threeDaysLater }
    })
        .sort({ expiryDate: 1 })
        .limit(3)
        .lean();

    const logs = [];

    // Order logs
    recentOrders.forEach((order) => {
        const userName = order.user?.name || 'Khách';
        const hours = Math.floor((now - new Date(order.createdAt)) / (1000 * 60 * 60));
        const minutes = Math.floor(((now - new Date(order.createdAt)) % (1000 * 60 * 60)) / (1000 * 60));
        const timeStr = hours > 0 ? `${hours} giờ trước` : `${minutes} phút trước`;

        logs.push({
            id: `order_${order._id}`,
            type: 'order',
            time: timeStr,
            text: `${userName} đã đặt đơn hàng #${order._id.toString().slice(-6).toUpperCase()} - ${order.orderItems?.length || 0} sản phẩm`,
            value: `${order.totalPrice?.toLocaleString() || 0}₫`
        });
    });

    // Low stock alerts
    lowStockItems.forEach((item) => {
        logs.push({
            id: `stock_${item._id}`,
            type: 'alert_stock',
            time: 'Cảnh báo',
            text: `Sản phẩm "${item.productName}" chỉ còn ${item.stock} sản phẩm trong kho`,
            value: `⚠ ${item.stock}`
        });
    });

    // Expiring voucher alerts
    expiringVouchers.forEach((voucher) => {
        const daysLeft = Math.ceil((new Date(voucher.expiryDate) - now) / (1000 * 60 * 60 * 24));
        logs.push({
            id: `voucher_${voucher._id}`,
            type: 'alert_voucher',
            time: `${daysLeft} ngày`,
            text: `Mã giảm giá "${voucher.code}" sắp hết hạn vào ${new Date(voucher.expiryDate).toLocaleDateString('vi-VN')}`,
            value: `🔥 ${voucher.usedCount}/${voucher.usageLimit}`
        });
    });

    // --- 5. Top Sales (Top sản phẩm bán chạy nhất tháng) ---
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const bestSelling = await Order.aggregate([
        {
            $match: {
                orderStatus: 'Đã giao',
                deliveredAt: { $gte: monthStart, $lte: now },
                isDelivered: true
            }
        },
        { $unwind: '$orderItems' },
        {
            $group: {
                _id: '$orderItems.product',
                name: { $first: '$orderItems.name' },
                totalRevenue: {
                    $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] }
                },
                totalSold: { $sum: '$orderItems.qty' }
            }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        {
            $addFields: {
                productName: { $ifNull: [{ $arrayElemAt: ['$productInfo.name', 0] }, '$name'] },
                category: { $ifNull: [{ $arrayElemAt: ['$productInfo.category', 0] }, 'Chưa phân loại'] },
                images: {
                    $ifNull: [{
                        $map: {
                            input: { $ifNull: [{ $arrayElemAt: ['$productInfo.images', 0] }, []] },
                            as: 'img',
                            in: '$$img.url'
                        }
                    }, []]
                }
            }
        },
        { $project: { productInfo: 0 } }
    ]);

    const topSales = bestSelling.map((item, index) => ({
        rank: index + 1,
        name: item.productName || 'Unknown',
        category: item.category || 'Chưa phân loại',
        revenue: item.totalRevenue || 0,
        images: Array.isArray(item.images) ? item.images : []
    }));

    // --- 6. Top Branches (Chi nhánh xử lý đơn siêu tốc) ---
    const branchSpeedAgg = await Order.aggregate([
        {
            $match: {
                orderStatus: 'Đã giao',
                deliveredAt: { $gte: todayStart, $lte: todayEnd },
                isDelivered: true,
                deliveredAt: { $ne: null },
                createdAt: { $ne: null }
            }
        },
        {
            $group: {
                _id: '$branch',
                avgProcessingTime: {
                    $avg: {
                        $divide: [
                            { $subtract: ['$deliveredAt', '$createdAt'] },
                            1000 * 60 // phút
                        ]
                    }
                },
                totalOrders: { $sum: 1 }
            }
        },
        { $sort: { avgProcessingTime: 1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'branches',
                localField: '_id',
                foreignField: '_id',
                as: 'branchInfo'
            }
        },
        {
            $addFields: {
                branchName: { $ifNull: [{ $arrayElemAt: ['$branchInfo.name', 0] }, 'Unknown'] }
            }
        },
        { $project: { branchInfo: 0 } }
    ]);

    const topBranches = branchSpeedAgg.map((item, index) => {
        const minutes = Math.round(item.avgProcessingTime || 0);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeStr = hours > 0 ? `${hours}h${mins}m` : `${mins} phút`;
        const status = minutes <= 120 ? 'Siêu tốc' : minutes <= 360 ? 'Nhanh' : 'Trung bình';

        return {
            rank: index + 1,
            name: item.branchName,
            time: timeStr,
            status
        };
    });

    return {
        kpis,
        channels,
        stockStatus,
        logs,
        topSales,
        topBranches
    };
};

/**
 * Lấy danh sách sản phẩm bán chạy
 * Lọc theo thời điểm hoàn thành giao vận (deliveredAt)
 */
export const getBestSellingProducts = async (period = 'month', branchId = null, limit = 10, sortBy = 'qty', startDateStr = null, endDateStr = null) => {
    let startDate, endDate;
    if (startDateStr && endDateStr) {
        startDate = new Date(`${startDateStr}T00:00:00`);
        endDate = new Date(`${endDateStr}T23:59:59.999`);
    } else {
        const range = getDateRange(period);
        startDate = range.startDate;
        endDate = range.endDate;
    }

    const matchStage = {
        orderStatus: 'Đã giao',
        deliveredAt: { $gte: startDate, $lte: endDate },
        isDelivered: true
    };

    if (branchId) {
        matchStage.branch = new mongoose.Types.ObjectId(branchId);
    }

    const sortField = sortBy === 'revenue' ? 'totalRevenue' : sortBy === 'profit' ? 'totalProfit' : 'totalSold';

    const pipeline = [
        { $match: matchStage },
        { $unwind: '$orderItems' },
        {
            $group: {
                _id: '$orderItems.product',
                name: { $first: '$orderItems.name' },
                totalSold: { $sum: '$orderItems.qty' },
                totalRevenue: {
                    $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] }
                },
                totalProfit: {
                    $sum: {
                        $multiply: [
                            { $subtract: ['$orderItems.price', { $ifNull: ['$orderItems.importPrice', 0] }] },
                            '$orderItems.qty'
                        ]
                    }
                }
            }
        },
        { $sort: { [sortField]: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        {
            $addFields: {
                productName: { $ifNull: [{ $arrayElemAt: ['$productInfo.name', 0] }, '$name'] },
                image: {
                    $ifNull: [
                        { $arrayElemAt: ['$productInfo.images.url', 0] },
                        null
                    ]
                }
            }
        },
        {
            $project: {
                productInfo: 0
            }
        }
    ];

    const result = await Order.aggregate(pipeline);
    return result;
};