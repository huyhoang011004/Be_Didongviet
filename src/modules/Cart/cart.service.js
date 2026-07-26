import Cart from '#cart/Cart.model.js';
import Product from '#product/Product.model.js';
import Inventory from '#inventory/Inventory.model.js';
import FlashSale from '#flashSale/FlashSale.model.js';

export const addToCartService = async (payload, userId) => {
    const { productId, variantId, quantity } = payload;

    const product = await Product.findById(productId);
    if (!product) throw new Error('Sản phẩm không tồn tại');

    const variant = product.variants.find(v => v._id.toString() === variantId);
    if (!variant) throw new Error('Phiên bản không hợp lệ');

    const stockDocs = await Inventory.aggregate([
        { $match: { sku: variant.sku } },
        { $group: { _id: null, totalStock: { $sum: '$stock' } } }
    ]);
    const actualStock = stockDocs.length > 0 ? stockDocs[0].totalStock : 0;

    if (actualStock < quantity) {
        throw new Error(`Rất tiếc, phiên bản này chỉ còn ${actualStock} sản phẩm`);
    }

    let cart = await Cart.findOne({ user: userId });
    let price = variant.salePrice || variant.price;

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
            const newQuantity = cart.items[itemIndex].quantity + quantity;
            if (actualStock < newQuantity) {
                throw new Error('Vượt quá số lượng tồn kho cho phép');
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

    return cart;
};
