/**
 * Route Registry - Centralized route registration
 * Giúp app.js gọn nhẹ, dễ bảo trì và thêm module mới
 */

import authRoute from '#auth/auth.route.js';
import productRoute from '#product/product.route.js';
import inventoryRoute from '#inventory/inventory.route.js';
import accountRoute from '#account/account.route.js';
import orderRoute from '#order/order.route.js';
import categoryRoute from '#category/category.route.js';
import voucherRoute from '#voucher/voucher.route.js';
import cartRoute from '#cart/cart.route.js';
import blogRoute from '#blog/blog.route.js';
import studentProfileRoute from '#studentProfile/studentProfile.route.js';
import branchRoute from '#branch/branch.route.js';
import contactRoute from '#contact/contact.route.js';
import reviewRoute from '#review/review.route.js';
import flashSaleRoute from '#flashSale/flashSale.route.js';
import analyticsRoute from '#analytics/analytics.route.js';
import paymentRoute from '#payment/payment.route.js';
import ghnRoute from '#ghn/ghn.route.js';

const routes = [
    { path: '/api/v1/auth', router: authRoute },
    { path: '/api/v1/products', router: productRoute },
    { path: '/api/v1/inventory', router: inventoryRoute },
    { path: '/api/v1/accounts', router: accountRoute },
    { path: '/api/v1/orders', router: orderRoute },
    { path: '/api/v1/categories', router: categoryRoute },
    { path: '/api/v1/vouchers', router: voucherRoute },
    { path: '/api/v1/cart', router: cartRoute },
    { path: '/api/v1/blogs', router: blogRoute },
    { path: '/api/v1/student-profile', router: studentProfileRoute },
    { path: '/api/v1/branches', router: branchRoute },
    { path: '/api/v1/contacts', router: contactRoute },
    { path: '/api/v1/reviews', router: reviewRoute },
    { path: '/api/v1/flash-sales', router: flashSaleRoute },
    { path: '/api/v1/analytics', router: analyticsRoute },
    { path: '/api/v1/payment', router: paymentRoute },
    { path: '/api/v1/ghn', router: ghnRoute },
];

/**
 * Đăng ký tất cả routes vào app
 * @param {import('express').Express} app - Express application instance
 */
export const registerRoutes = (app) => {
    routes.forEach(({ path, router }) => {
        app.use(path, router);
    });
};

export default routes;