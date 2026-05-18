import Cart from '#cart/Cart.model.js';
import Product from '#product/Product.model.js';
import Voucher from '#voucher/Voucher.model.js';
import StudentProfile from '#studentProfile/StudentProfile.model.js';

// --- ADMIN: LẤY TẤT CẢ GIỎ HÀNG ---
export const getAllCarts = async (req, res) => {
    try {
        const carts = await Cart.find({})
            .populate('user', 'name email phone')
            .populate('items.product', 'name images category');

        res.status(200).json({ success: true, data: carts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- ADMIN: XÓA GIỎ HÀNG CỦA USER ---
export const deleteCart = async (req, res) => {
    try {
        const { userId } = req.params;

        const cart = await Cart.findOneAndDelete({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Giỏ hàng không tồn tại' });
        }

        res.status(200).json({ success: true, message: 'Đã xóa giỏ hàng của user' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};