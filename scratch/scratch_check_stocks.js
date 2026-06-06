import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/DỰ ÁN/Project_Didongviet/be_didongviet_expressjs/.env') });

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING;

const productSchema = new mongoose.Schema({
    name: String,
    variants: [{
        color: String,
        ram: String,
        rom: String,
        stock: Number,
        price: Number,
        salePrice: Number
    }]
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const products = await Product.find({}).limit(10);
        for (const p of products) {
            console.log(`Product: ${p.name}`);
            if (!p.variants || p.variants.length === 0) {
                console.log('  -> No variants');
            } else {
                p.variants.forEach(v => {
                    console.log(`  -> Variant ID: ${v._id}, Color: ${v.color}, RAM/ROM: ${v.ram}/${v.rom}, Stock: ${v.stock}`);
                });
            }
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
