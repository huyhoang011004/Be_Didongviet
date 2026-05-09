import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// 1. Thêm sản phẩm vào giỏ hàng (Xử lý theo Variant)
const addToCart = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        const userId = req.user._id;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        // Tìm thông tin phiên bản (màu sắc, dung lượng) trong mảng variants của Product
        const selectedVariant = product.variants.find(v => v._id.toString() === variantId);
        if (!selectedVariant) {
            return res.status(404).json({ success: false, message: 'Phiên bản sản phẩm không hợp lệ' });
        }

        // Kiểm tra tồn kho của riêng phiên bản đó
        if (selectedVariant.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Phiên bản này không đủ hàng' });
        }

        let cart = await Cart.findOne({ user: userId });

        if (cart) {
            // LOGIC QUAN TRỌNG: Kiểm tra trùng cả ProductID và VariantID
            const itemIndex = cart.items.findIndex(
                p => p.product.toString() === productId && p.variantId.toString() === variantId
            );

            if (itemIndex > -1) {
                // Nếu trùng hoàn toàn: Cộng dồn số lượng
                cart.items[itemIndex].quantity += quantity;
            } else {
                // Nếu khác phiên bản: Thêm dòng mới
                cart.items.push({
                    product: productId,
                    variantId: variantId,
                    quantity,
                    selectedColor: selectedVariant.color,
                    selectedStorage: selectedVariant.storage,
                    price: selectedVariant.salePrice || selectedVariant.price
                });
            }
            await cart.save();
        } else {
            // Tạo giỏ hàng mới nếu chưa có
            cart = await Cart.create({
                user: userId,
                items: [{
                    product: productId,
                    variantId: variantId,
                    quantity,
                    selectedColor: selectedVariant.color,
                    selectedStorage: selectedVariant.storage,
                    price: selectedVariant.salePrice || selectedVariant.price
                }]
            });
        }

        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Cập nhật số lượng (Cần truyền cả variantId để xác định đúng dòng)
const updateCartItem = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        const cart = await Cart.findOne({ user: req.user._id });

        if (!cart) return res.status(404).json({ message: 'Giỏ hàng trống' });

        const itemIndex = cart.items.findIndex(
            p => p.product.toString() === productId && p.variantId.toString() === variantId
        );

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = quantity;
            await cart.save();
            res.status(200).json({ success: true, data: cart });
        } else {
            res.status(404).json({ message: 'Không tìm thấy phiên bản sản phẩm này trong giỏ' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Xóa sản phẩm (Dựa trên VariantID)
const removeFromCart = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
        const cart = await Cart.findOne({ user: req.user._id });

        if (cart) {
            // Lọc bỏ dòng khớp cả 2 ID
            cart.items = cart.items.filter(
                item => !(item.product.toString() === productId && item.variantId.toString() === variantId)
            );
            await cart.save();
            res.status(200).json({ success: true, data: cart });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name images');
        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export { addToCart, getCart, updateCartItem, removeFromCart };