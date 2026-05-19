import Cart from '#cart/Cart.model.js';
import Product from '#product/Product.model.js';
import Voucher from '#voucher/Voucher.model.js';
import StudentProfile from '#studentProfile/StudentProfile.model.js';
import { calculateVoucherDiscount } from '#utils/voucherHelper.js';

// --- THÊM VÀO GIỎ HÀNG ---
export const addToCart = async (req, res) => {
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

            if (variant.stock < quantity) {
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
        await cart.populate('items.product', 'name images category');

        // Trường hợp giỏ hàng trống (Xử lý nhanh không cần đi tiếp)
        if (cart.items.length === 0) {
            cart.appliedVoucher = null;
            cart.discountAmount = 0;
            cart.finalPrice = 0;
            await cart.save();
            return res.status(200).json({ success: true, data: cart });
        }

        // Tạm thời lấy tổng tiền gốc sau khi đã chạy lệnh populate hoặc tính toán xong
        const currentSubTotal = cart.totalPrice;

        // XỬ LÝ VOUCHER ĐỂ CẬP NHẬT VÀO DATABASE
        if (cart.appliedVoucher) {
            const { discount, reason } = await calculateVoucherDiscount(cart.appliedVoucher, currentSubTotal, req.user._id);

            if (reason) {
                // NẾU VOUCHER BỊ LỖI HOẶC HẾT HẠN:
                // Xóa trắng dữ liệu mã giảm giá ngay trong DB
                cart.appliedVoucher = null;
                cart.discountAmount = 0;
                cart.finalPrice = currentSubTotal;

                await cart.save(); // Lưu lại thay đổi vào database
            } else {
                // NẾU VOUCHER HỢP LỆ:
                // Cập nhật số tiền giảm và giá cuối cùng mới nhất vào DB
                cart.discountAmount = discount;
                cart.finalPrice = Math.max(0, currentSubTotal - discount);

                await cart.save(); // Lưu lại để đồng bộ database
            }
        } else {
            // NẾU GIỎ HÀNG KHÔNG ÁP DỤNG VOUCHER NÀO:
            // Đảm bảo database sạch sẽ, không lưu đè dữ liệu cũ rác
            cart.discountAmount = 0;
            cart.finalPrice = currentSubTotal;

            await cart.save();
        }

        // Trả về object Giỏ hàng đã được đồng bộ chuẩn chỉnh từ DB
        return res.status(200).json({
            success: true,
            data: cart
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

        // 2. Tìm Giỏ hàng
        const cart = await Cart.findOne({ user: userId });
        if (!cart || cart.items.length === 0) return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });

        // Tính tạm tính để check điều kiện voucher
        const currentSubTotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // 3. Check HSSV (Nếu có)
        if (voucher.isHSSVOnly) {
            const student = await StudentProfile.findOne({ userId, isHSSVVerified: 'Đã xác thực' });
            if (!student) return res.status(403).json({ success: false, message: 'Chỉ dành cho HSSV đã xác thực' });
        }

        // 4. Tính toán số tiền giảm
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

        // 5. CẬP NHẬT VÀO DATABASE (Chỉ lưu code, không lưu discount cố định)
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


