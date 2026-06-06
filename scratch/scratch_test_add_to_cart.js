import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/DỰ ÁN/Project_Didongviet/be_didongviet_expressjs/.env') });

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING;

// Import models
import Product from '../src/modules/Product/Product.model.js';
import Cart from '../src/modules/Cart/Cart.model.js';
import Account from '../src/modules/Account/Account.model.js';

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Lấy 1 account
        const user = await Account.findOne({ email: 'user1@gmail.com' });
        if (!user) {
            console.error('No user found');
            await mongoose.disconnect();
            return;
        }
        console.log('Using User:', user.email, 'ID:', user._id);

        // Lấy 1 sản phẩm có variant
        const product = await Product.findOne({ "variants.0": { $exists: true } });
        if (!product) {
            console.error('No product with variants found');
            await mongoose.disconnect();
            return;
        }
        const variant = product.variants[0];
        console.log('Using Product:', product.name, 'Variant ID:', variant._id, 'SKU:', variant.sku);

        // Chạy giả lập logic addToCart
        const productId = product._id.toString();
        const variantId = variant._id.toString();
        const quantity = 1;

        console.log('Simulating addToCart...');
        const price = variant.salePrice || variant.price;

        let cart = await Cart.findOne({ user: user._id });
        if (cart) {
            console.log('Cart found, items count:', cart.items.length);
            const itemIndex = cart.items.findIndex(
                p => p.product.toString() === productId && p.variantId.toString() === variantId
            );

            if (itemIndex > -1) {
                const newQuantity = cart.items[itemIndex].quantity + quantity;
                console.log(`Item exists. New qty: ${newQuantity}`);
                cart.items[itemIndex].quantity = newQuantity;
            } else {
                console.log('Adding new item to existing cart');
                cart.items.push({ 
                    product: productId, 
                    variantId, 
                    quantity, 
                    selectedColor: variant.color, 
                    selectedStorage: variant.ram && variant.rom ? `${variant.ram}/${variant.rom}` : (variant.storage || ''), 
                    price 
                });
            }
            console.log('Saving cart...');
            await cart.save();
        } else {
            console.log('Creating new cart...');
            cart = await Cart.create({
                user: user._id,
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

        console.log('Success! Cart saved:', JSON.stringify(cart, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error during simulation:', err);
    }
}

run();
