import Cart from '#cart/Cart.model.js';
import Product from '#product/Product.model.js';
import Voucher from '#voucher/Voucher.model.js';
import StudentProfile from '#studentProfile/StudentProfile.model.js';
// --- THÊM VÀO GIỎ HÀNG ---
const addToCart = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        const userId = req.user._id;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) return res.status(404).json({ success: false, message: 'Phiên bản không hợp lệ' });

        if (variant.stock < quantity) {
            return res.status(400).json({ success: false, message: `Rất tiếc, phiên bản này chỉ còn ${variant.stock} sản phẩm` });
        }

        let cart = await Cart.findOne({ user: userId });
        const price = variant.salePrice || variant.price;

        if (cart) {
            const itemIndex = cart.items.findIndex(
                p => p.product.toString() === productId && p.variantId.toString() === variantId
            );

            if (itemIndex > -1) {
                // Kiểm tra nếu tổng số lượng mới vượt quá tồn kho
                const newQuantity = cart.items[itemIndex].quantity + quantity;
                if (variant.stock < newQuantity) {
                    return res.status(400).json({ success: false, message: 'Vượt quá số lượng tồn kho cho phép' });
                }
                cart.items[itemIndex].quantity = newQuantity;
            } else {
                cart.items.push({ product: productId, variantId, quantity, selectedColor: variant.color, selectedStorage: variant.storage, price });
            }
            await cart.save();
        } else {
            cart = await Cart.create({
                user: userId,
                items: [{ product: productId, variantId, quantity, selectedColor: variant.color, selectedStorage: variant.storage, price }]
            });
        }
        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- CẬP NHẬT SỐ LƯỢNG ---
const updateCartItem = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        if (quantity < 1) return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' });

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Giỏ hàng trống' });

        const itemIndex = cart.items.findIndex(
            p => p.product.toString() === productId && p.variantId.toString() === variantId
        );

        if (itemIndex > -1) {
            // Kiểm tra tồn kho thực tế trước khi cập nhật
            const product = await Product.findById(productId);
            const variant = product.variants.find(v => v._id.toString() === variantId);

            if (variant.stock < quantity) {
                return res.status(400).json({ success: false, message: 'Số lượng yêu cầu vượt quá tồn kho' });
            }

            cart.items[itemIndex].quantity = quantity;
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
const removeFromCart = async (req, res) => {
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
const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
            .populate('items.product', 'name images category'); // Lấy thêm thông tin cần thiết

        if (!cart) {
            return res.status(200).json({ success: true, data: { items: [], totalPrice: 0 } });
        }

        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- API: ÁP DỤNG MÃ GIẢM GIÁ ---
const applyVoucher = async (req, res) => {
    try {
        const { voucherCode } = req.body;
        const userId = req.user._id;

        // 1. Kiểm tra Voucher tồn tại và còn trong thời gian hiệu lực
        const voucher = await Voucher.findOne({
            code: voucherCode.toUpperCase(),
            isActive: true,
            expiryDate: { $gte: new Date() },
            startDate: { $lte: new Date() }
        });

        if (!voucher) {
            return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn' });
        }

        if (voucher.usedCount >= voucher.usageLimit) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng trên hệ thống' });
        }

        // 2. Kiểm tra giỏ hàng của người dùng
        const cart = await Cart.findOne({ user: userId });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng của bạn đang trống' });
        }

        // Tính toán tổng tiền tạm tính của giỏ hàng
        const subTotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // 3. KIỂM TRA ĐẶC QUYỀN HSSV (Logic mới bổ sung)
        if (voucher.isHSSVOnly) {
            const studentProfile = await StudentProfile.findOne({ userId: userId });

            if (!studentProfile || studentProfile.isHSSVVerified !== 'Đã xác thực') {
                return res.status(403).json({
                    success: false,
                    message: 'Mã giảm giá độc quyền này chỉ áp dụng cho Học sinh - Sinh viên đã xác thực tài khoản thành công!'
                });
            }
        }

        // 4. TÍNH TOÁN SỐ TIỀN GIẢM GIÁ (Cập nhật cơ chế đa tầng)
        let discount = 0;

        if (voucher.discountType === 'hssv_tiered') {
            // Sắp xếp các tầng giảm giá theo thứ tự giá trị đơn hàng giảm dần (từ cao xuống thấp)
            const sortedTiers = voucher.hssvTiers.sort((a, b) => b.minOrderValue - a.minOrderValue);

            // Tìm tầng ưu đãi cao nhất mà đơn hàng hiện tại đáp ứng được điều kiện
            const matchingTier = sortedTiers.find(tier => subTotal >= tier.minOrderValue);

            if (!matchingTier) {
                // Lấy mốc tiền thấp nhất để thông báo chính xác cho khách hàng
                const lowestTier = sortedTiers[sortedTiers.length - 1];
                return res.status(400).json({
                    success: false,
                    message: `Đơn hàng chưa đạt giá trị tối thiểu để hưởng đặc quyền HSSV. Giá trị đơn cần từ ${lowestTier.minOrderValue.toLocaleString()}đ để được giảm ngay ${lowestTier.discountAmount.toLocaleString()}đ`
                });
            }

            discount = matchingTier.discountAmount;

        } else {
            // Logic xử lý các loại voucher phổ thông (fixed / percentage)
            if (subTotal < voucher.minOrderAmount) {
                return res.status(400).json({
                    success: false,
                    message: `Mã này chỉ áp dụng cho đơn hàng từ ${voucher.minOrderAmount.toLocaleString()}đ`
                });
            }

            if (voucher.discountType === 'percentage') {
                discount = (subTotal * voucher.discountValue) / 100;
                if (voucher.maxDiscount) {
                    discount = Math.min(discount, voucher.maxDiscount);
                }
            } else if (voucher.discountType === 'fixed') {
                discount = voucher.discountValue;
            }
        }

        // Ngăn chặn trường hợp số tiền giảm vượt quá tổng tiền giỏ hàng thực tế
        if (discount > subTotal) discount = subTotal;

        // 5. Cập nhật thông tin giảm giá vào giỏ hàng phục vụ bước Checkout đặt hàng
        cart.voucherCode = voucher.code;
        cart.discountAmount = discount;
        await cart.save();

        res.status(200).json({
            success: true,
            message: voucher.discountType === 'hssv_tiered'
                ? 'Áp dụng đặc quyền HSSV thành công'
                : 'Áp dụng mã giảm giá thành công',
            discountAmount: discount,
            newTotal: subTotal - discount
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', error: error.message });
    }
};

export { addToCart, getCart, updateCartItem, removeFromCart, applyVoucher };