import * as analyticsService from './analytics.service.js';

export const getAnalytics = async (req, res, next) => {
    try {
        const { period = 'month', branchId, startDate, endDate } = req.query;
        const data = await analyticsService.getAnalyticsData(period, branchId || null, startDate || null, endDate || null);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getBestSellingProducts = async (req, res, next) => {
    try {
        const { period = 'month', branchId, limit = '10', sortBy = 'qty', startDate, endDate } = req.query;
        const data = await analyticsService.getBestSellingProducts(
            period,
            branchId || null,
            parseInt(limit, 10) || 10,
            sortBy,
            startDate || null,
            endDate || null
        );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getChartData = async (req, res, next) => {
    try {
        const { period = 'month', branchId, startDate, endDate } = req.query;
        const data = await analyticsService.getChartData(period, branchId || null, startDate || null, endDate || null);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderStatusSummary = async (req, res, next) => {
    try {
        const { branchId } = req.query;
        const data = await analyticsService.getOrderStatusSummary(branchId || null);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getLowStockProducts = async (req, res, next) => {
    try {
        const { threshold = '5', limit = '5' } = req.query;
        const data = await analyticsService.getLowStockProducts(parseInt(threshold, 10) || 5, parseInt(limit, 10) || 5);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getOldStockProducts = async (req, res, next) => {
    try {
        const { days = '60', limit = '5' } = req.query;
        const data = await analyticsService.getOldStockProducts(parseInt(days, 10) || 60, parseInt(limit, 10) || 5);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getBranchRanking = async (req, res, next) => {
    try {
        const { period = 'month', limit = '10', startDate, endDate } = req.query;
        const data = await analyticsService.getBranchRanking(period, parseInt(limit, 10) || 10, startDate || null, endDate || null);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getDashboardOverview = async (req, res, next) => {
    try {
        const data = await analyticsService.getDashboardOverview();

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};
