import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Voucher from '../src/modules/Voucher/Voucher.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017/didongviet';

const sampleVouchers = [
    {
        code: 'DIDONGVIET',
        description: 'Giảm ngay 50.000đ cho đơn hàng từ 200.000đ trở lên',
        discountType: 'fixed',
        discountValue: 50000,
        minOrderAmount: 200000,
        startDate: new Date('2026-01-01'),
        expiryDate: new Date('2027-12-31'),
        usageLimit: 1000,
        maxUsagePerUser: 5,
        isHSSVOnly: false,
        isActive: true
    },
    {
        code: 'HE10',
        description: 'Giảm 10% tối đa 100.000đ cho đơn hàng từ 500.000đ',
        discountType: 'percentage',
        discountValue: 10,
        maxDiscount: 100000,
        minOrderAmount: 500000,
        startDate: new Date('2026-01-01'),
        expiryDate: new Date('2027-12-31'),
        usageLimit: 500,
        maxUsagePerUser: 1,
        isHSSVOnly: false,
        isActive: true
    },
    {
        code: 'FREE',
        description: 'Giảm ngay 20.000đ cho đơn hàng từ 100.000đ',
        discountType: 'fixed',
        discountValue: 20000,
        minOrderAmount: 100000,
        startDate: new Date('2026-01-01'),
        expiryDate: new Date('2027-12-31'),
        usageLimit: 1000,
        maxUsagePerUser: 2,
        isHSSVOnly: false,
        isActive: true
    },
    {
        code: 'SV50',
        description: 'Giảm 50.000đ dành riêng cho Học sinh - Sinh viên',
        discountType: 'fixed',
        discountValue: 50000,
        minOrderAmount: 150000,
        startDate: new Date('2026-01-01'),
        expiryDate: new Date('2027-12-31'),
        usageLimit: 200,
        maxUsagePerUser: 1,
        isHSSVOnly: true,
        isActive: true
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to Atlas Database');
        
        // Clear existing vouchers first
        await Voucher.deleteMany({});
        console.log('Cleared existing vouchers in Atlas');

        const docs = await Voucher.insertMany(sampleVouchers);
        console.log(`Successfully seeded ${docs.length} vouchers to Atlas!`);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
