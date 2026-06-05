import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Account from './src/modules/Account/Account.model.js';
import Branch from './src/modules/Branch/Branch.model.js';

dotenv.config();

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
        console.log('Connected to Database.');

        const adminUser = await Account.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error('Không tìm thấy tài khoản admin nào.');
            return;
        }
        console.log('Admin user found:', adminUser.email);

        const token = jwt.sign({ _id: adminUser._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        let branch = await Branch.findOne();
        if (!branch) {
            branch = await Branch.create({
                name: 'Chi nhánh Test',
                address: '123 Đường Test, Hà Nội',
                phone: '0123456789'
            });
            console.log('Đã tạo chi nhánh test mới:', branch._id);
        } else {
            console.log('Tìm thấy chi nhánh hiện có:', branch._id, branch.name);
        }

        const testFind1 = await Branch.findById(branch._id);
        const testFind2 = await Branch.findById(branch._id.toString());
        console.log('testFind1 (ObjectId):', !!testFind1);
        console.log('testFind2 (String):', !!testFind2);
        console.log('Branch details:', JSON.stringify(branch, null, 2));

        const rawDoc = await mongoose.connection.db.collection('branches').findOne();
        console.log('Raw Doc _id type:', typeof rawDoc._id, rawDoc._id.constructor.name);
        console.log('Raw Doc _id value:', rawDoc._id);

        const updateUrl = `http://localhost:5000/api/v1/branches/${branch._id}`;
        console.log(`Sending PATCH request to: ${updateUrl}`);
        const patchRes = await fetch(updateUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                name: branch.name + ' (Đã cập nhật)',
                address: branch.address,
                phone: branch.phone,
                managerName: 'Quản lý Test',
                isActive: true
            })
        });

        const patchData = await patchRes.json();
        console.log('PATCH Status:', patchRes.status);
        console.log('PATCH Response:', patchData);

        const deleteUrl = `http://localhost:5000/api/v1/branches/${branch._id}`;
        console.log(`Sending DELETE request to: ${deleteUrl}`);
        const deleteRes = await fetch(deleteUrl, {
            method: 'DELETE',
            headers
        });

        const deleteData = await deleteRes.json();
        console.log('DELETE Status:', deleteRes.status);
        console.log('DELETE Response:', deleteData);

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
};

test();
