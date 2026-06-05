import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const migrate = async () => {
    try {
        if (!process.env.MONGODB_CONNECTION_STRING) {
            console.error("Lỗi: MONGODB_CONNECTION_STRING chưa được định nghĩa trong file .env!");
            process.exit(1);
        }

        console.log('Đang kết nối tới cơ sở dữ liệu...');
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
        console.log('Kết nối thành công.');

        const db = mongoose.connection.db;
        const productsCollection = db.collection('products');
        const inventoriesCollection = db.collection('inventories');

        console.log('Đang đọc danh sách sản phẩm...');
        const products = await productsCollection.find().toArray();
        console.log(`Tìm thấy ${products.length} sản phẩm cần xử lý.`);

        let count = 0;
        for (const product of products) {
            if (!product.variants || !Array.isArray(product.variants)) {
                continue;
            }

            for (const variant of product.variants) {
                if (!variant.sku) {
                    console.warn(`Cảnh báo: Biến thể của sản phẩm "${product.name}" không có SKU.`);
                    continue;
                }

                if (variant.inventory && Array.isArray(variant.inventory)) {
                    for (const inv of variant.inventory) {
                        if (!inv.branch) {
                            console.warn(`Cảnh báo: Bản ghi tồn kho của SKU "${variant.sku}" không có thông tin chi nhánh.`);
                            continue;
                        }

                        let branchId;
                        try {
                            branchId = new mongoose.Types.ObjectId(inv.branch);
                        } catch (err) {
                            console.error(`Lỗi: ID chi nhánh không hợp lệ "${inv.branch}" cho SKU "${variant.sku}":`, err.message);
                            continue;
                        }

                        const stock = typeof inv.stock === 'number' ? inv.stock : parseInt(inv.stock) || 0;

                        console.log(`Đang ghi nhận tồn kho: SKU: ${variant.sku} | Chi nhánh: ${branchId} | Số lượng: ${stock}`);
                        await inventoriesCollection.updateOne(
                            { sku: variant.sku, branch: branchId },
                            {
                                $set: {
                                    product: product._id,
                                    sku: variant.sku,
                                    branch: branchId,
                                    stock: stock,
                                    lowStockThreshold: 5
                                }
                            },
                            { upsert: true }
                        );
                        count++;
                    }
                }
            }
        }

        console.log(`=== DI CƯ HOÀN THÀNH: ĐÃ TẠO/CẬP NHẬT THÀNH CÔNG ${count} BẢN GHI TỒN KHO ===`);

    } catch (error) {
        console.error('Lỗi trong quá trình di cư dữ liệu:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Đã ngắt kết nối cơ sở dữ liệu.');
    }
};

migrate();
