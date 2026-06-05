import mongoose from 'mongoose';
import Branch from './Branch.model.js';
import Product from '../Product/Product.model.js';
import Inventory from '../Inventory/Inventory.model.js';

// Lấy danh sách tất cả chi nhánh
export const getAllBranches = async (req, res) => {
    try {
        const { all } = req.query;
        const filter = all === 'true' ? {} : { isActive: true };
        const branches = await Branch.find(filter);
        res.status(200).json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Tạo chi nhánh mới
export const createBranch = async (req, res) => {
    try {
        const newBranch = await Branch.create(req.body);
        res.status(201).json({ success: true, data: newBranch });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Lấy tồn kho sản phẩm tại một chi nhánh cụ thể
export const getBranchInventory = async (req, res) => {
    try {
        const { id } = req.params;

        // Sử dụng aggregation để tìm các sản phẩm có tồn kho tại chi nhánh này
        const products = await Inventory.aggregate([
            {
                $match: {
                    branch: new mongoose.Types.ObjectId(id),
                    stock: { $gt: 0 }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "product",
                    foreignField: "_id",
                    as: "productDoc"
                }
            },
            { $unwind: "$productDoc" },
            {
                $project: {
                    name: "$productDoc.name",
                    _id: "$productDoc._id",
                    variant: {
                        $filter: {
                            input: "$productDoc.variants",
                            as: "v",
                            cond: { $eq: ["$$v.sku", "$sku"] }
                        }
                    },
                    stock: "$stock"
                }
            },
            { $unwind: "$variant" }
        ]);

        res.status(200).json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy thông tin chi tiết một chi nhánh
export const getBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh này' });
        }

        res.status(200).json({ success: true, data: branch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật thông tin chi nhánh
export const updateBranch = async (req, res) => {
    try {
        const updatedBranch = await Branch.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true } // new: true trả về bản ghi mới sau update
        );

        if (!updatedBranch) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh để cập nhật' });
        }

        res.status(200).json({ success: true, data: updatedBranch });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Xóa chi nhánh
export const deleteBranch = async (req, res) => {
    try {
        // Lưu ý: Trong thực tế, nên kiểm tra xem chi nhánh có tồn kho không trước khi xóa
        // Hoặc sử dụng "soft delete" (cập nhật isActive = false thay vì xóa hẳn)
        const branch = await Branch.findByIdAndDelete(req.params.id);

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh để xóa' });
        }

        res.status(200).json({ success: true, message: 'Đã xóa chi nhánh thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};