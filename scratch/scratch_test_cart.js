import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/DỰ ÁN/Project_Didongviet/be_didongviet_expressjs/.env') });

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING;

if (!MONGODB_URI) {
    console.error('No MONGODB_CONNECTION_STRING found in environment');
    process.exit(1);
}

const cartSchema = new mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    items: [{
        product: mongoose.Schema.Types.ObjectId,
        variantId: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        selectedColor: String,
        selectedStorage: String,
        price: Number
    }]
}, { strict: false });

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

const accountSchema = new mongoose.Schema({
    email: String
}, { strict: false });

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Tìm tất cả accounts
        const accounts = await Account.find({}).limit(5);
        console.log('Accounts sample:', accounts.map(a => ({ id: a._id, email: a.email })));

        // Tìm tất cả carts
        const carts = await Cart.find({}).limit(5);
        console.log('Carts sample:', JSON.stringify(carts, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
