import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
        console.log('Connected to Database.');

        const rawInventory = await mongoose.connection.db.collection('inventories').findOne();
        if (rawInventory) {
            console.log('Raw Inventory document:', JSON.stringify(rawInventory, null, 2));
            console.log('branch field type:', typeof rawInventory.branch, rawInventory.branch.constructor.name);
        } else {
            console.log('No inventory documents found.');
        }

        const rawBranches = await mongoose.connection.db.collection('branches').find().toArray();
        console.log('Total branches:', rawBranches.length);
        rawBranches.forEach(b => {
            console.log(`Branch ID: "${b._id}" (type: ${typeof b._id}), Name: "${b.name}"`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

debug();
