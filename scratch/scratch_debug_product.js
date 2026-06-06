import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/DỰ ÁN/Project_Didongviet/be_didongviet_expressjs/.env') });

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING;

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const p = await Product.findById('6a19f63844ac55122e011c3b');
        if (!p) {
            console.log('Product 6a19f63844ac55122e011c3b NOT FOUND');
        } else {
            console.log('Product Name:', p.get('name'));
            console.log('Variants:', JSON.stringify(p.get('variants'), null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
