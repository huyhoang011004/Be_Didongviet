import mongoose from 'mongoose';
import Order from '#order/Order.model.js';
import Product from '#product/Product.model.js';
import Cart from '#cart/Cart.model.js';
import Inventory from '#inventory/Inventory.model.js';
import Voucher from '#voucher/Voucher.model.js';
import Branch from '#branch/Branch.model.js';
import FlashSale from '#flashSale/FlashSale.model.js';

export const createOrderService = async (payload, user) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            orderItems,
            shippingAddress,
            paymentMethod,
            discountDMember,
            tradeInBonus,
            shippingPrice,
            branchId,
            appliedVoucher,
            discountVoucher
        } = payload;

        if (!orderItems || orderItems.length === 0) {
            throw new Error('Đơn hàng trống');
        }

        if (!branchId) {
            throw new Error('Vui lòng chọn chi nhánh nhận hàng!');
        }

        if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.province || !shippingAddress.district || !shippingAddress.ward || !shippingAddress.streetAddress) {
            throw new Error('Vui lòng cung cấp đầy đủ thông tin nhận hàng (Tên, Số điện thoại, Tỉnh/thành, Quận/huyện, Phường/xã, Địa chỉ)');
        }

        let calculatedItemsPrice = 0;
        const finalOrderItems = [];

        const now = new Date();
        const currentHour = now.getHours();
        const activeSale = await FlashSale.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        }).session(session);

        let activeSaleProducts = [];
        let activeSaleId = null;
        if (activeSale) {
            const activeSlot = activeSale.timeSlots.find(slot => {
                return currentHour >= slot && currentHour < (slot + (activeSale.duration / 60));
            });
            if (activeSlot !== undefined) {
                activeSaleProducts = activeSale.products;
                activeSaleId = activeSale._id;
            }
        }

        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (!product) {
                throw new Error('Không tìm thấy sản phẩm trong hệ thống!');
            }

            let variant = null;
            if (item.variantId) {
                variant = product.variants.find(v => String(v._id) === String(item.variantId));
                if (!variant) {
                    throw new Error('Không tìm thấy phiên bản phân loại sản phẩm!');
                }
            }

            const sku = variant ? variant.sku : product.variants?.[0]?.sku;
            if (!sku) {
                throw new Error(`Sản phẩm "${product.name}" không có mã phân loại SKU hợp lệ!`);
            }

            const updatedInventory = await Inventory.findOneAndUpdate(
                { product: item.product, sku: sku, branch: branchId, stock: { $gte: item.qty } },
                { $inc: { stock: -item.qty } },
                { session, returnDocument: 'after' }
            );

            if (!updatedInventory) {
                throw new Error(`Sản phẩm "${product.name}" có phiên bản hoặc số lượng không đủ trong kho tại chi nhánh đã chọn, vui lòng kiểm tra lại!`);
            }

            let price = variant
                ? (variant.salePrice || variant.price || 0)
                : (product.price || 0);
            
            if (activeSaleId) {
                const fsProduct = activeSaleProducts.find(p => String(p.product) === String(product._id));
                if (fsProduct && fsProduct.flashSalePrice) {
                    price = fsProduct.flashSalePrice;
                    
                    await FlashSale.updateOne(
                        { _id: activeSaleId, 'products.product': product._id },
                        { $inc: { 'products.$.soldCount': item.qty } },
                        { session }
                    );
                }
            }

            const importPrice = variant?.importPrice || 0;

            calculatedItemsPrice += price * item.qty;

            finalOrderItems.push({
                product: product._id,
                variantId: item.variantId || null,
                name: product.name,
                qty: item.qty,
                image: variant?.variantImage || product.featuredImage || product.images?.[0]?.url || '',
                price,
                importPrice,
                selectedColor: variant?.color || '',
                selectedStorage: variant?.ram && variant?.rom ? `${variant.ram}/${variant.rom}` : (variant?.storage || ''),
                sku
            });
        }

        const totalDiscount = (discountDMember || 0) + (tradeInBonus || 0) + (discountVoucher || 0);
        const totalPrice = (calculatedItemsPrice + (shippingPrice || 0)) - totalDiscount;

        const branchInfo = await Branch.findById(branchId).select('name address phone');

        const order = new Order({
            user: user._id,
            branch: branchId,
            deliveryBranch: branchInfo ? {
                name: branchInfo.name,
                address: branchInfo.address,
                phone: branchInfo.phone,
            } : undefined,
            orderItems: finalOrderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice: calculatedItemsPrice,
            discountDMember,
            tradeInBonus,
            appliedVoucher: appliedVoucher || null,
            discountVoucher: discountVoucher || 0,
            shippingPrice,
            totalPrice: totalPrice < 0 ? 0 : totalPrice,
        });

        const createdOrder = await order.save({ session });

        const productIds = finalOrderItems.map(item => item.product);
        await Cart.findOneAndUpdate(
            { user: user._id },
            { $pull: { items: { product: { $in: productIds } } } },
            { session }
        );

        if (appliedVoucher) {
            const voucherCode = appliedVoucher.toUpperCase();

            const userUsageCount = await Order.countDocuments({
                user: user._id,
                appliedVoucher: voucherCode,
                orderStatus: { $nin: ['Đã hủy'] }
            }).session(session);

            const voucher = await Voucher.findOne({ code: voucherCode }).session(session);
            if (voucher && userUsageCount >= voucher.maxUsagePerUser) {
                throw new Error(`Bạn đã sử dụng mã này ${voucher.maxUsagePerUser} lần. Không thể sử dụng thêm.`);
            }

            if (voucher && voucher.usedCount >= voucher.usageLimit) {
                throw new Error('Mã giảm giá đã hết lượt sử dụng.');
            }

            await Voucher.findOneAndUpdate(
                { code: voucherCode },
                { $inc: { usedCount: 1 } },
                { session }
            );
        }

        await session.commitTransaction();
        session.endSession();

        return createdOrder;
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const cancelOrderService = async (orderId) => {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');

    const statusMap = {
        'Đang xử lý': 'Chờ xác nhận',
        'Đã xác nhận': 'Chờ lấy hàng',
        'Đang giao hàng': 'Đang giao',
        'Đã hoàn thành': 'Đã giao'
    };
    const currentStatus = statusMap[order.orderStatus] || order.orderStatus || 'Chờ xác nhận';

    if (currentStatus !== 'Chờ xác nhận') {
        throw new Error('Không thể hủy đơn hàng đã xác nhận hoặc đang giao');
    }

    order.orderStatus = 'Đã hủy';
    await order.save();

    const restoreStockPromises = order.orderItems.map(async (item) => {
        const product = await Product.findById(item.product);
        if (!product) return;
        const variant = product.variants?.find(v => String(v._id) === String(item.variantId)) || product.variants?.[0];
        const sku = variant ? variant.sku : null;
        if (sku && order.branch) {
            await Inventory.findOneAndUpdate(
                { product: item.product, sku: sku, branch: order.branch },
                { $inc: { stock: item.qty } },
                { upsert: true }
            );
        }
    });
    await Promise.all(restoreStockPromises);

    if (order.appliedVoucher) {
        await Voucher.findOneAndUpdate(
            { code: order.appliedVoucher.toUpperCase() },
            { $inc: { usedCount: -1 } }
        );
    }
    return true;
};
