import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
        console.log('Connected to Database.');

        const db = mongoose.connection.db;
        const branchesCollection = db.collection('branches');
        const rawBranches = await branchesCollection.find().toArray();
        
        console.log(`Found ${rawBranches.length} branches to check.`);
        let migratedCount = 0;

        for (const branch of rawBranches) {
            if (typeof branch._id === 'string') {
                console.log(`Migrating branch "${branch.name}" (ID: ${branch._id}) from String to ObjectId...`);
                
                const oldId = branch._id;
                const newId = new mongoose.Types.ObjectId(oldId);
                
                // Copy và đổi _id thành ObjectId
                const newDoc = { ...branch, _id: newId };
                
                // Xóa tài liệu cũ
                const deleteResult = await branchesCollection.deleteOne({ _id: oldId });
                if (deleteResult.deletedCount === 1) {
                    // Chèn tài liệu mới
                    await branchesCollection.insertOne(newDoc);
                    console.log(`Successfully migrated branch "${branch.name}"!`);
                    migratedCount++;
                } else {
                    console.error(`Failed to delete old branch with string ID: ${oldId}`);
                }
            } else {
                console.log(`Branch "${branch.name}" already has ObjectId _id.`);
            }
        }

        console.log(`=== DI CƯ HOÀN THÀNH: ĐÃ CHUYỂN ĐỔI ${migratedCount} CHI NHÁNH ===`);

    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
};

migrate();
