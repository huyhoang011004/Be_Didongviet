import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Voucher from '../src/modules/Voucher/Voucher.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017/didongviet';

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to Atlas Database');
        
        const vouchers = await Voucher.find({});
        console.log(`Found ${vouchers.length} vouchers:`);
        vouchers.forEach(v => {
            console.log({
                code: v.code,
                discountType: v.discountType,
                discountValue: v.discountValue,
                minOrderAmount: v.minOrderAmount,
                isActive: v.isActive,
                startDate: v.startDate,
                expiryDate: v.expiryDate,
                isHSSVOnly: v.isHSSVOnly
            });
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
