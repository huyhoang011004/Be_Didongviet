import * as productService from '#product/product.admin.service.js';
import Product from './Product.model.js';
export const createProduct = async (req, res) => {
    try {
        const newProduct = await productService.createProductService(req.body, req.files);

        return res.status(201).json({
            success: true,
            message: "Tạo sản phẩm thành công",
            data: newProduct
        });
    } catch (error) {
        console.error('CREATE PRODUCT ERROR:', error?.message || error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Mã SKU hoặc slug đã tồn tại!"
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Cập nhật tồn kho / Cấu hình ngưỡng cảnh báo
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedProduct = await productService.updateProductService(id, req.body, req.files);

        return res.json({
            success: true,
            message: 'Cập nhật sản phẩm thành công',
            data: updatedProduct
        });
    } catch (error) {
        console.error('UPDATE PRODUCT ERROR:', error?.message || error);
        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await productService.deleteProductService(id);

        return res.json({
            success: true,
            message: 'Đã xóa sản phẩm và các tệp liên quan thành công'
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteSoftProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        return res.json({
            success: true,
            message: 'Đã chuyển trạng thái sản phẩm sang ngừng kinh doanh (xóa mềm)',
            data: product
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const setThumbnail = async (req, res) => {
    const { id } = req.params;
    const { imageId } = req.body;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });

    product.images.forEach(img => {
        img.isThumbnail = false;
    });

    const image = product.images.id(imageId);
    if (image) {
        image.isThumbnail = true;
    }

    await product.save();
    res.json(product);
};

export const replaceImage = async (req, res) => {
    const { id, imageId } = req.params;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });

    const image = product.images.id(imageId);
    if (!image) {
        return res.status(404).json({ success: false, message: "Không tìm thấy ảnh" });
    }

    // xóa file cũ
    const oldPath = `.${image.url}`;
    if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
    }

    // gán file mới
    image.url = '/' + req.file.path.replace(/\\/g, '/');

    await product.save();
    res.json(product);
};

export const deleteImage = async (req, res) => {
    const { id, imageId } = req.params;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });

    const image = product.images.id(imageId);
    if (!image) {
        return res.status(404).json({ success: false, message: "Không tìm thấy ảnh" });
    }

    // xóa file
    const oldPath = `.${image.url}`;
    if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
    }

    image.deleteOne();
    await product.save();
    res.json(product);
};

export const reorderImages = async (req, res) => {
    const { id } = req.params;
    const orders = req.body;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });

    orders.forEach(item => {
        const image = product.images.id(item.imageId);
        if (image) {
            image.order = item.order;
        }
    });

    await product.save();
    res.json(product);
};