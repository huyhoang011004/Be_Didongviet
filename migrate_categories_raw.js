import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Category from './src/modules/Category/Category.model.js';

dotenv.config();

const migrate = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
        console.log('Connected successfully!');

        const categories = await Category.find().lean();
        console.log(`Found ${categories.length} categories in database.`);

        // Build a helper map for quick lookup
        const catMap = new Map();
        categories.forEach(c => {
            catMap.set(c._id.toString(), c);
        });

        // Helper to resolve ancestors recursively
        const getAncestors = (catId) => {
            const cat = catMap.get(catId);
            if (!cat) return [];
            
            const parentId = cat.parentCategory && typeof cat.parentCategory === 'object'
                ? cat.parentCategory._id?.toString() || cat.parentCategory.toString()
                : cat.parentCategory?.toString();

            if (!parentId) return [];
            return [...getAncestors(parentId), parentId];
        };

        const db = mongoose.connection.db;
        let updatedCount = 0;
        for (const cat of categories) {
            const computedAncestorsStr = getAncestors(cat._id.toString());
            const computedAncestorsObj = computedAncestorsStr.map(id => new mongoose.Types.ObjectId(id));
            
            console.log(`- Category: "${cat.name}" | Parent ID: ${cat.parentCategory || 'None'} | Computed Ancestors:`, computedAncestorsStr);
            
            const res = await db.collection('categories').updateOne(
                { _id: cat._id },
                { $set: { ancestors: computedAncestorsObj } }
            );
            console.log('Update result:', res);
            updatedCount++;
        }

        console.log(`Successfully updated ${updatedCount} categories!`);
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
};

migrate();
