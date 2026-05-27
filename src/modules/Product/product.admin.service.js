import fs from 'fs';
import path from 'path';
import Product from '#product/Product.model.js';
import Category from '#category/Category.model.js';
import slugify from '#utils/slugify.js';

export const createProductService = async (bodyData, files) => {
    const uploadedFiles = [];
    try {
        let data = { ...bodyData };

        if (typeof data.variants === 'string') {
            data.variants = JSON.parse(data.variants);
        }

        const productImages = files?.images || [];
        // if (productImages.length === 0) {
        //     throw new Error('Phải có ít nhất 1 ảnh sản phẩm');
        // }
        if (productImages.length > 6) {
            throw new Error('Tối đa 6 ảnh sản phẩm');
        }

        uploadedFiles.push(...productImages);

        data.images = productImages.map((file, index) => ({
            url: '/' + file.path.replace(/\\/g, '/'),
            isThumbnail: index === 0,
            order: index,
            alt: data.name || ''
        }));

        data.video = data.video || null;

        const variantImages = files?.variantImages || [];
        uploadedFiles.push(...variantImages);

        data.variants = data.variants.map((variant, index) => {
            const image = variantImages[index];
            return {
                ...variant,
                variantImage: image ? '/' + image.path.replace(/\\/g, '/') : null
            };
        });

        const newProduct = await Product.create(data);
        return newProduct;

    } catch (error) {
        // Rollback xóa file nếu lỗi xảy ra
        uploadedFiles.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
        throw error;
    }
};

export const updateProductService = async (id, bodyData, files) => {
    const uploadedFiles = [];
    try {
        let updateData = { ...bodyData };

        if (typeof updateData.variants === 'string') {
            updateData.variants = JSON.parse(updateData.variants);
        }

        const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
        const query = isObjectId ? { _id: id } : { slug: id };

        const oldProduct = await Product.findOne(query).populate('category');
        if (!oldProduct) {
            const error = new Error('Không tìm thấy sản phẩm');
            error.statusCode = 404;
            throw error;
        }

        let oldProductFolderSlug = slugify(oldProduct.name);
        let newProductFolderSlug = updateData.name ? slugify(updateData.name) : oldProductFolderSlug;
        const isNameChanged = updateData.name && updateData.name !== oldProduct.name;

        // Xử lý đổi tên thư mục và file
        if (isNameChanged) {
            updateData.slug = slugify(updateData.name);
            let categoryPath = slugify(oldProduct.category.name);
            if (oldProduct.category.parentCategory) {
                const parent = await Category.findById(oldProduct.category.parentCategory);
                if (parent) {
                    categoryPath = `${slugify(parent.name)}/${slugify(oldProduct.category.name)}`;
                }
            }

            const oldDirPath = path.join('uploads', categoryPath, oldProductFolderSlug);
            const newDirPath = path.join('uploads', categoryPath, newProductFolderSlug);

            if (fs.existsSync(newDirPath) && oldDirPath !== newDirPath) {
                const temporaryFiles = fs.readdirSync(newDirPath);
                temporaryFiles.forEach(file => {
                    fs.renameSync(path.join(newDirPath, file), path.join(oldDirPath, file));
                });
                fs.rmdirSync(newDirPath);
            }

            if (fs.existsSync(oldDirPath)) {
                const filesInDir = fs.readdirSync(oldDirPath);
                filesInDir.forEach(fileName => {
                    if (fileName.includes(oldProductFolderSlug)) {
                        const newFileName = fileName.split(oldProductFolderSlug).join(newProductFolderSlug);
                        fs.renameSync(path.join(oldDirPath, fileName), path.join(oldDirPath, newFileName));
                    }
                });
                fs.renameSync(oldDirPath, newDirPath);
            }

            files?.images?.forEach(file => {
                file.path = file.path.split(oldProductFolderSlug).join(newProductFolderSlug);
            });
            files?.variantImages?.forEach(file => {
                file.path = file.path.split(oldProductFolderSlug).join(newProductFolderSlug);
            });
        }

        // Xử lý ảnh chính sản phẩm
        const productImages = files?.images || [];
        if (productImages.length > 0) {
            if (productImages.length > 6) {
                throw new Error('Tối đa 6 ảnh sản phẩm');
            }
            uploadedFiles.push(...productImages);

            if (oldProduct.images?.length > 0) {
                oldProduct.images.forEach(imgObj => {
                    if (imgObj.url) {
                        const updatedOldPath = imgObj.url.split(oldProductFolderSlug).join(newProductFolderSlug);
                        const oldPath = `.${updatedOldPath}`;
                        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    }
                });
            }

            updateData.images = productImages.map((file, index) => ({
                url: '/' + file.path.replace(/\\/g, '/'),
                isThumbnail: index === 0,
                order: index,
                alt: updateData.name || oldProduct.name || ''
            }));
        } else if (oldProduct.images?.length > 0 && isNameChanged) {
            updateData.images = oldProduct.images.map(imgObj => ({
                ...imgObj.toObject(),
                url: imgObj.url.split(oldProductFolderSlug).join(newProductFolderSlug)
            }));
        }

        // Xử lý ảnh biến thể
        const variantImages = files?.variantImages || [];
        uploadedFiles.push(...variantImages);

        if (updateData.variants) {
            updateData.variants = updateData.variants.map((variant, index) => {
                const image = variantImages[index];
                const oldVariant = oldProduct.variants[index];

                if (image) {
                    if (oldVariant?.variantImage) {
                        const updatedOldVPath = oldVariant.variantImage.split(oldProductFolderSlug).join(newProductFolderSlug);
                        const oldVariantPath = `.${updatedOldVPath}`;
                        if (fs.existsSync(oldVariantPath)) fs.unlinkSync(oldVariantPath);
                    }
                    return { ...variant, variantImage: '/' + image.path.replace(/\\/g, '/') };
                }

                if (isNameChanged) {
                    const currentVariantImage = variant.variantImage || oldVariant?.variantImage || null;
                    if (currentVariantImage) {
                        return { ...variant, variantImage: currentVariantImage.split(oldProductFolderSlug).join(newProductFolderSlug) };
                    }
                }

                return { ...variant, variantImage: variant.variantImage || oldVariant?.variantImage || null };
            });
        } else if (isNameChanged && oldProduct.variants?.length > 0) {
            updateData.variants = oldProduct.variants.map(oldVariant => {
                const variantObj = oldVariant.toObject();
                if (variantObj.variantImage) {
                    variantObj.variantImage = variantObj.variantImage.split(oldProductFolderSlug).join(newProductFolderSlug);
                }
                return variantObj;
            });
        }

        if (updateData.video === '') updateData.video = null;

        const updatedProduct = await Product.findOneAndUpdate(
            query,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        return updatedProduct;

    } catch (error) {
        uploadedFiles.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
        throw error;
    }
};

export const deleteProductService = async (id) => {
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: id } : { slug: id };

    const product = await Product.findOne(query);
    if (!product) {
        const error = new Error('Sản phẩm không tồn tại');
        error.statusCode = 404;
        throw error;
    }

    // Xóa file ảnh vật lý của sản phẩm chính
    if (product.images && product.images.length > 0) {
        product.images.forEach(imgObj => {
            if (imgObj.url) {
                const imagePath = `.${imgObj.url}`;
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }
        });
    }

    // Xóa file ảnh vật lý của biến thể
    if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
            if (variant.variantImage) {
                const vPath = `.${variant.variantImage}`;
                if (fs.existsSync(vPath)) fs.unlinkSync(vPath);
            }
        });
    }

    await Product.deleteOne(query);
    return true;
};

export const getLowStockProductsService = async (thresholdQuery, pageQuery, limitQuery) => {
    const threshold = parseInt(thresholdQuery) || 5;
    const page = parseInt(pageQuery) || 1;
    const limit = parseInt(limitQuery) || 10;
    const skip = (page - 1) * limit;

    const query = {
        variants: {
            $elemMatch: {
                stock: { $lte: threshold }
            }
        }
    };

    const totalItems = await Product.countDocuments(query);
    const products = await Product.find(query)
        .populate('category', 'name slug')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        products,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        },
        threshold
    };
};