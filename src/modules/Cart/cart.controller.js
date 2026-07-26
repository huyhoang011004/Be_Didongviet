import mongoose from 'mongoose';
import Cart from '#cart/Cart.model.js';
import Product from '#product/Product.model.js';
import Voucher from '#voucher/Voucher.model.js';
import StudentProfile from '#studentProfile/StudentProfile.model.js';
import Inventory from '#inventory/Inventory.model.js';
import Order from '#order/Order.model.js';
import { calculateVoucherDiscount } from '#utils/voucherHelper.js';
import FlashSale from '#flashSale/FlashSale.model.js';

// --- THÊM VÀO GIỎ HÀNG ---
export const addToCart = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        const userId = req.user._id;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) return res.status(404).json({ success: false, message: 'Phiên bản không hợp lệ' });

        // Tính tồn kho thực tế từ Inventory cho variant này
        const stockDocs = await Inventory.aggregate([
            { $match: { sku: variant.sku } },
            { $group: { _id: null, totalStock: { $sum: '$stock' } } }
        ]);
        const actualStock = stockDocs.length > 0 ? stockDocs[0].totalStock : 0;

        if (actualStock < quantity) {
            return res.status(400).json({ success: false, message: `Rất tiếc, phiên bản này chỉ còn ${actualStock} sản phẩm` });
        }

        let cart = await Cart.findOne({ user: userId });
        let price = variant.salePrice || variant.price;

        // Cập nhật giá flash sale nếu có
        const now = new Date();
        const currentHour = now.getHours();
        const activeSale = await FlashSale.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        });

        if (activeSale) {
            const activeSlot = activeSale.timeSlots.find(slot => currentHour >= slot && currentHour < (slot + (activeSale.duration / 60)));
            if (activeSlot !== undefined) {
                const fsProduct = activeSale.products.find(p => String(p.product) === String(product._id));
                if (fsProduct && fsProduct.flashSalePrice) {
                    price = fsProduct.flashSalePrice;
                }
            }
        }

        if (cart) {
            const itemIndex = cart.items.findIndex(
                p => p.product.toString() === productId && p.variantId.toString() === variantId
            );

            if (itemIndex > -1) {
                // Kiểm tra nếu tổng số lượng mới vượt quá tồn kho
                const newQuantity = cart.items[itemIndex].quantity + quantity;
                if (actualStock < newQuantity) {
                    return res.status(400).json({ success: false, message: 'Vượt quá số lượng tồn kho cho phép' });
                }
                cart.items[itemIndex].quantity = newQuantity;
            } else {
                cart.items.push({
                    product: productId,
                    variantId,
                    quantity,
                    selectedColor: variant.color,
                    selectedStorage: variant.ram && variant.rom ? `${variant.ram}/${variant.rom}` : (variant.storage || ''),
                    price
                });
            }
            await cart.save();
        } else {
            cart = await Cart.create({
                user: userId,
                items: [{
                    product: productId,
                    variantId,
                    quantity,
                    selectedColor: variant.color,
                    selectedStorage: variant.ram && variant.rom ? `${variant.ram}/${variant.rom}` : (variant.storage || ''),
                    price
                }]
            });
        }
        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- CẬP NHẬT SỐ LƯỢNG ---
export const updateCartItem = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        if (quantity < 1) return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' });

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Giỏ hàng trống' });

        const itemIndex = cart.items.findIndex(
            p => p.product.toString() === productId && p.variantId.toString() === variantId
        );

        if (itemIndex > -1) {
            // 1. Kiểm tra tồn kho
            const product = await Product.findById(productId);
            if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại' });

            const variant = product.variants.find(v => v._id.toString() === variantId);
            if (!variant) return res.status(404).json({ message: 'Phiên bản không tồn tại' });

            // Tính tồn kho thực tế từ Inventory cho variant này
            const stockDocs = await Inventory.aggregate([
                { $match: { sku: variant.sku } },
                { $group: { _id: null, totalStock: { $sum: '$stock' } } }
            ]);
            const actualStock = stockDocs.length > 0 ? stockDocs[0].totalStock : 0;

            if (actualStock < quantity) {
                return res.status(400).json({ success: false, message: 'Số lượng yêu cầu vượt quá tồn kho' });
            }

            // 2. Cập nhật số lượng
            cart.items[itemIndex].quantity = quantity;

            // 3. Thực hiện lưu - Middleware sẽ tự động tính lại totalPrice tại đây
            await cart.save();

            res.status(200).json({ success: true, data: cart });
        } else {
            res.status(404).json({ message: 'Không tìm thấy phiên bản này trong giỏ' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- XÓA PHÂN LOẠI KHỎI GIỎ ---
export const removeFromCart = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
        const cart = await Cart.findOne({ user: req.user._id });

        if (cart) {
            cart.items = cart.items.filter(
                item => !(item.product.toString() === productId && item.variantId.toString() === variantId)
            );
            await cart.save();
            return res.status(200).json({ success: true, data: cart });
        }
        res.status(404).json({ message: 'Giỏ hàng không tồn tại' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- HIỂN THỊ GIỎ HÀNG ---

export const getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.status(200).json({
                success: true,
                data: { items: [], totalPrice: 0, discountAmount: 0, finalPrice: 0, appliedVoucher: null }
            });
        }

        if (!Array.isArray(cart.items)) cart.items = [];

        // Populate thông tin sản phẩm đầy đủ để hiển thị lên giao diện
        await cart.populate({
            path: 'items.product',
            select: 'name images category variants slug isActive',
            populate: {
                path: 'category',
                select: 'name slug'
            }
        });

        // Trường hợp giỏ hàng trống (Xử lý nhanh không cần đi tiếp)
        if (cart.items.length === 0) {
            cart.appliedVoucher = null;
            cart.discountAmount = 0;
            cart.finalPrice = 0;
            await cart.save();
            return res.status(200).json({ success: true, data: cart });
        }

        // --- Cập nhật lại giá dựa theo Flash Sale (Re-validate giá) ---
        const now = new Date();
        const currentHour = now.getHours();
        const activeSale = await FlashSale.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true
        });

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

        let isPriceChanged = false;

        cart.items.forEach(item => {
            const product = item.product; // Đã được populate
            if (!product || !product.variants) return;

            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            if (!variant) return;

            let currentPrice = variant.salePrice || variant.price || 0;

            if (activeSaleId) {
                const fsProduct = activeSaleProducts.find(p => String(p.product) === String(product._id));
                if (fsProduct && fsProduct.flashSalePrice) {
                    currentPrice = fsProduct.flashSalePrice;
                }
            }

            if (item.price !== currentPrice) {
                item.price = currentPrice;
                isPriceChanged = true;
            }
        });

        if (isPriceChanged) {
            await cart.save(); // save sẽ trigger middleware pre('save') để tính lại totalPrice
        }

        // Tạm thời lấy tổng tiền gốc sau khi đã chạy lệnh populate hoặc tính toán xong
        const currentSubTotal = cart.totalPrice;

        // XỬ LÝ VOUCHER ĐỂ CẬP NHẬT VÀO DATABASE
        if (cart.appliedVoucher) {
            const { discount, reason } = await calculateVoucherDiscount(cart.appliedVoucher, currentSubTotal, req.user._id);

            if (reason) {
                cart.appliedVoucher = null;
                cart.discountAmount = 0;
                cart.finalPrice = currentSubTotal;
                await cart.save();
            } else {
                cart.discountAmount = discount;
                cart.finalPrice = Math.max(0, currentSubTotal - discount);
                await cart.save();
            }
        } else {
            cart.discountAmount = 0;
            cart.finalPrice = currentSubTotal;
            await cart.save();
        }

        // Sau khi lưu, chuyển cart sang plain object để tránh Mongoose strip field lạ
        const cartObj = cart.toObject();

        // Lấy danh sách tất cả productId và sku từ cart items
        const productIds = [];
        const allSkuList = [];
        cartObj.items.forEach(item => {
            const prod = item.product || {};
            if (prod._id && !productIds.includes(prod._id.toString())) {
                productIds.push(prod._id.toString());
            }
            if (prod.variants) {
                prod.variants.forEach(v => {
                    if (v.sku && !allSkuList.includes(v.sku)) {
                        allSkuList.push(v.sku);
                    }
                });
            }
        });

        // Tính tổng tồn kho theo productId (tổng toàn bộ sản phẩm)
        const productStockMap = {};
        if (productIds.length > 0) {
            const productStockDocs = await Inventory.aggregate([
                { $match: { product: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) } } },
                { $group: { _id: '$product', totalStock: { $sum: '$stock' } } }
            ]);
            productStockDocs.forEach(item => {
                productStockMap[item._id.toString()] = item.totalStock;
            });
        }

        // Tính tổng tồn kho theo sku (tổng của từng phân loại)
        const skuStockMap = {};
        if (allSkuList.length > 0) {
            const skuStockDocs = await Inventory.aggregate([
                { $match: { sku: { $in: allSkuList } } },
                { $group: { _id: '$sku', totalStock: { $sum: '$stock' } } }
            ]);
            skuStockDocs.forEach(item => {
                skuStockMap[item._id] = item.totalStock;
            });
        }

        // Gắn stock vào từng variant và isProductActive, totalStock vào product
        cartObj.items.forEach(item => {
            const prod = item.product || {};
            if (prod.variants) {
                prod.variants.forEach(v => {
                    v.stock = skuStockMap[v.sku] || 0;
                });
            }
            // Gắn tổng tồn kho của toàn bộ sản phẩm (tùy chọn cho FE nếu cần)
            prod.totalStock = productStockMap[prod._id?.toString()] || 0;
        });

        // Trả về plain object (không bị Mongoose strip field)
        return res.status(200).json({
            success: true,
            data: cartObj
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// --- ÁP DỤNG MÃ GIẢM GIÁ ---
export const applyVoucher = async (req, res) => {
    try {
        const { voucherCode } = req.body;
        const userId = req.user._id;

        // 1. Tìm Voucher
        const voucher = await Voucher.findOne({
            code: voucherCode.toUpperCase(),
            isActive: true,
            expiryDate: { $gte: new Date() },
            startDate: { $lte: new Date() }
        });

        if (!voucher) return res.status(404).json({ success: false, message: 'Mã không tồn tại hoặc hết hạn' });

        // 2. Kiểm tra số lượt dùng tổng (usageLimit)
        if (voucher.usedCount >= voucher.usageLimit) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng' });
        }

        // 3. Kiểm tra số lượt dùng của user (maxUsagePerUser)
        const userUsageCount = await Order.countDocuments({
            user: userId,
            appliedVoucher: voucher.code,
            orderStatus: { $nin: ['Đã hủy'] }
        });
        if (userUsageCount >= voucher.maxUsagePerUser) {
            return res.status(400).json({ success: false, message: `Bạn đã sử dụng mã này ${voucher.maxUsagePerUser} lần. Không thể sử dụng thêm.` });
        }

        // 4. Tìm Giỏ hàng
        const cart = await Cart.findOne({ user: userId });
        if (!cart || cart.items.length === 0) return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });

        // Tính tạm tính để check điều kiện voucher
        const currentSubTotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // 5. Check HSSV (Nếu có)
        if (voucher.isHSSVOnly) {
            const student = await StudentProfile.findOne({ userId, isHSSVVerified: 'Đã xác thực' });
            if (!student) return res.status(403).json({ success: false, message: 'Chỉ dành cho HSSV đã xác thực' });
        }

        // 6. Tính toán số tiền giảm
        let discount = 0;
        if (voucher.discountType === 'hssv_tiered') {
            const matchingTier = voucher.hssvTiers
                .sort((a, b) => b.minOrderValue - a.minOrderValue)
                .find(tier => currentSubTotal >= tier.minOrderValue);

            if (!matchingTier) return res.status(400).json({ success: false, message: 'Chưa đủ giá trị đơn tối thiểu' });
            discount = matchingTier.discountAmount;
        } else {
            // Logic Fixed / Percentage
            if (currentSubTotal < voucher.minOrderAmount) return res.status(400).json({ success: false, message: 'Đơn hàng chưa đủ điều kiện' });

            if (voucher.discountType === 'percentage') {
                discount = (currentSubTotal * voucher.discountValue) / 100;
                if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
            } else {
                discount = voucher.discountValue;
            }
        }

        // 7. CẬP NHẬT VÀO DATABASE (Chỉ lưu code, không lưu discount cố định)
        cart.appliedVoucher = voucher.code;

        await cart.save(); // Khi save, pre-save middleware chỉ cần tính subTotal của các item.

        res.status(200).json({
            success: true,
            message: 'Áp dụng mã thành công',
            data: {
                voucherCode: cart.appliedVoucher,
                subTotal: currentSubTotal,
                discountAmount: discount, // Trả về số tiền giảm tạm tính để FE hiển thị ngay lúc đó
                finalPrice: currentSubTotal - discount
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- ĐỔI PHÂN LOẠI MƯỢT MÀ ---
export const changeCartItemVariant = async (req, res) => {
    try {
        const { productId, oldVariantId, newVariantId, quantity } = req.body;
        const userId = req.user._id;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng không tồn tại' });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });

        const newVariant = product.variants.find(v => v._id.toString() === newVariantId);
        if (!newVariant) return res.status(404).json({ success: false, message: 'Phân loại mới không hợp lệ' });

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.variantId.toString() === oldVariantId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm cũ trong giỏ hàng' });
        }

        // Kiểm tra xem phân loại mới đã có sẵn chưa
        const newVariantItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.variantId.toString() === newVariantId
        );

        if (newVariantItemIndex > -1 && newVariantItemIndex !== itemIndex) {
            // Đã có phân loại mới -> gộp số lượng và xóa item cũ
            const totalQty = cart.items[newVariantItemIndex].quantity + quantity;
            if (newVariant.stock && newVariant.stock < totalQty) {
                return res.status(400).json({ success: false, message: 'Vượt quá số lượng tồn kho khi gộp phân loại' });
            }
            cart.items[newVariantItemIndex].quantity = totalQty;
            cart.items.splice(itemIndex, 1);
        } else {
            // Chưa có -> cập nhật tại chỗ
            if (newVariant.stock && newVariant.stock < quantity) {
                return res.status(400).json({ success: false, message: 'Vượt quá số lượng tồn kho' });
            }
            cart.items[itemIndex].variantId = newVariantId;
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].selectedColor = newVariant.color;
            cart.items[itemIndex].selectedStorage = newVariant.ram && newVariant.rom ? `${newVariant.ram}/${newVariant.rom}` : (newVariant.storage || '');
            cart.items[itemIndex].price = newVariant.salePrice || newVariant.price;
        }

        await cart.save();
        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


