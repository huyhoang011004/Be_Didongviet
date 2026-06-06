import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/DỰ ÁN/Project_Didongviet/be_didongviet_expressjs/.env') });

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING;

const productSchema = new mongoose.Schema({
    variants: [{
        _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
        color: String,
        ram: String,
        rom: String,
        price: Number,
        salePrice: Number,
        sku: String
    }]
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const productsCollection = db.collection('products');
        
        const products = await productsCollection.find({}).toArray();
        let updatedCount = 0;

        for (const p of products) {
            let isModified = false;
            const variants = p.variants || [];
            
            for (const v of variants) {
                if (!v._id) {
                    v._id = new mongoose.Types.ObjectId();
                    isModified = true;
                    console.log(`Generating ID ${v._id} for variant SKU ${v.sku} in product: ${p.name}`);
                }
            }

            if (isModified) {
                await productsCollection.updateOne(
                    { _id: p._id },
                    { $set: { variants: variants } }
                );
                updatedCount++;
            }
        }

        console.log(`Done! Updated ${updatedCount} products.`);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
