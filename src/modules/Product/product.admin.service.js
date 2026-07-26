import fs from "fs";
import path from "path";
import Product from "#product/Product.model.js";
import Category from "#category/Category.model.js";
import slugify from "#utils/slugify.js";
import mongoose from "mongoose";
import Inventory from "../Inventory/Inventory.model.js";

export const createProductService = async (bodyData, files) => {
  const uploadedFiles = [];
  try {
    let data = { ...bodyData };

    // 1. Parse các biến thể sản phẩm (variants)
    if (typeof data.variants === "string") {
      data.variants = JSON.parse(data.variants);
    }

    // 2. Parse cấu trúc mảng hình ảnh (imagesState) từ FE
    let imagesState = [];
    if (data.imagesState) {
      try {
        imagesState =
          typeof data.imagesState === "string"
            ? JSON.parse(data.imagesState)
            : data.imagesState;
      } catch (e) {
        console.error("Lỗi parse imagesState Tạo mới:", e);
      }
    }

    // 3. Gom và map tất cả file ảnh chính sản phẩm dựa trên tên file: prodimg_[index]_
    const productImagesFiles = files?.images || [];
    const productImageFileMap = {};

    productImagesFiles.forEach((file) => {
      uploadedFiles.push(file); // Lưu lại để rollback nếu có lỗi hệ thống
      const match = file.originalname.match(/^prodimg_(\d+)_/);
      if (match) {
        const fileIdx = parseInt(match[1], 10);
        productImageFileMap[fileIdx] = "/" + file.path.replace(/\\/g, "/");
      }
    });

    // 4. Xây dựng mảng images lưu vào DB
    const finalImages = [];
    if (imagesState && imagesState.length > 0) {
      imagesState.forEach((item) => {
        if (item.type === 'url' && item.url) {
          let cleanUrl = item.url;
          const cleanBaseUrl = (
            process.env.BASE_URL || "http://localhost:5000"
          ).replace(/\/$/, "");
          if (cleanUrl.startsWith(cleanBaseUrl)) {
            cleanUrl = cleanUrl.replace(cleanBaseUrl, "");
          }
          finalImages.push({
            url: cleanUrl,
            isUploaded: cleanUrl.startsWith("/uploads/"),
            alt: data.name || "",
          });
        } else if (item.type === 'file' && item.fileIndex !== undefined) {
          const uploadedPath = productImageFileMap[item.fileIndex];
          if (uploadedPath) {
            finalImages.push({
              url: uploadedPath,
              isUploaded: true,
              alt: data.name || "",
            });
          }
        }
      });
      data.images = finalImages;
    } else if (productImagesFiles.length > 0) {
      // Dự phòng nếu FE chỉ gửi files thuần túy
      data.images = productImagesFiles.map((file) => ({
        url: "/" + file.path.replace(/\\/g, "/"),
        isUploaded: true,
        alt: data.name || "",
      }));
    }

    data.video = data.video || null;

    // 5. Xử lý hình ảnh cho từng Variant biến thể (giữ nguyên logic gốc chạy ổn định của bạn)
    const variantImages = files?.variantImages || [];
    uploadedFiles.push(...variantImages);

    const variantImageMap = {};
    variantImages.forEach((file) => {
      const match = file.originalname.match(/^variant_(\d+)_/);
      if (match) {
        const idx = parseInt(match[1], 10);
        variantImageMap[idx] = "/" + file.path.replace(/\\/g, "/");
      }
    });

    data.variants = data.variants.map((variant, index) => {
      const newUploadedImage = variantImageMap[index];
      return {
        ...variant,
        variantImage: newUploadedImage || variant.variantImage || null,
      };
    });

    // 6. Tiến hành lưu vào database MongoDB
    const newProduct = await Product.create(data);

    // Lưu thông tin tồn kho cho từng variant vào bảng Inventory
    if (data.variants && Array.isArray(data.variants)) {
      for (const variant of data.variants) {
        if (variant.inventory && Array.isArray(variant.inventory)) {
          for (const inv of variant.inventory) {
            await Inventory.create({
              product: newProduct._id,
              sku: variant.sku,
              branch: inv.branch,
              stock: inv.stock || 0,
              lowStockThreshold: 5
            });
          }
        }
      }
    }

    return newProduct;
  } catch (error) {
    // Rollback xóa toàn bộ các file đã upload vào thư mục local nếu tiến trình tạo sản phẩm thất bại
    uploadedFiles.forEach((file) => {
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

    if (typeof updateData.variants === "string") {
      updateData.variants = JSON.parse(updateData.variants);
    }

    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: id } : { slug: id };

    const oldProduct = await Product.findOne(query);
    if (!oldProduct) {
      const error = new Error("Không tìm thấy sản phẩm");
      error.statusCode = 404;
      throw error;
    }

    const isNameChanged =
      updateData.name && updateData.name !== oldProduct.name;
    if (isNameChanged) {
      updateData.slug = slugify(updateData.name);
    }

    // 0. Xử lý xóa vật lý các ảnh cũ bị loại bỏ
    let deletedImages = [];
    if (updateData.deletedImages) {
      try {
        deletedImages =
          typeof updateData.deletedImages === "string"
            ? JSON.parse(updateData.deletedImages)
            : updateData.deletedImages;
      } catch (e) {
        console.error("Lỗi parse deletedImages:", e);
      }
    }

    if (deletedImages && deletedImages.length > 0) {
      deletedImages.forEach((imgUrl) => {
        if (imgUrl && imgUrl.startsWith("/uploads/")) {
          const filePath = `.${imgUrl}`;
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              // console.log("Đã xóa file ảnh vật lý thành công:", filePath);
            } catch (err) {
              console.warn("Không thể xóa file ảnh cũ:", filePath, err.message);
            }
          }
        }
      });
    }

    // Xử lý ảnh chính sản phẩm (images)
    let imagesState = [];
    if (updateData.imagesState) {
      try {
        imagesState =
          typeof updateData.imagesState === "string"
            ? JSON.parse(updateData.imagesState)
            : updateData.imagesState;
      } catch (e) {
        console.error("Lỗi parse imagesState Cập nhật:", e);
      }
    }

    const productImagesFiles = files?.images || [];
    const productImageFileMap = {};
    productImagesFiles.forEach((file) => {
      const match = file.originalname.match(/^prodimg_(\d+)_/);
      if (match) {
        const fileIdx = parseInt(match[1], 10);
        productImageFileMap[fileIdx] = "/" + file.path.replace(/\\/g, "/");
        uploadedFiles.push(file);
      } else {
        uploadedFiles.push(file);
      }
    });

    if (imagesState && imagesState.length > 0) {
      const finalImages = [];
      imagesState.forEach((item) => {
        if (item.type === 'url' && item.url) {
          let cleanUrl = item.url;
          const cleanBaseUrl = (
            process.env.BASE_URL || "http://localhost:5000"
          ).replace(/\/$/, "");
          if (cleanUrl.startsWith(cleanBaseUrl)) {
            cleanUrl = cleanUrl.replace(cleanBaseUrl, "");
          }

          finalImages.push({
            url: cleanUrl,
            isUploaded: cleanUrl.startsWith("/uploads/"),
            alt: updateData.name || oldProduct.name || "",
          });
        } else if (item.type === 'file' && item.fileIndex !== undefined) {
          const uploadedPath = productImageFileMap[item.fileIndex];
          if (uploadedPath) {
            finalImages.push({
              url: uploadedPath,
              isUploaded: true,
              alt: updateData.name || oldProduct.name || "",
            });
          }
        }
      });
      updateData.images = finalImages;
    } else if (productImagesFiles.length > 0) {
      // Fallback nếu không có imagesState
      updateData.images = productImagesFiles.map((file) => ({
        url: "/" + file.path.replace(/\\/g, "/"),
        isUploaded: true,
        alt: updateData.name || oldProduct.name || "",
      }));
    }

    // Xử lý ảnh biến thể
    const variantImages = files?.variantImages || [];
    uploadedFiles.push(...variantImages);

    const variantImageMap = {};
    variantImages.forEach((file) => {
      const match = file.originalname.match(/^variant_(\d+)_/);
      if (match) {
        const idx = parseInt(match[1], 10);
        variantImageMap[idx] = "/" + file.path.replace(/\\/g, "/");
      }
    });

    if (updateData.variants) {
      updateData.variants = updateData.variants.map((variant, index) => {
        const imagePath = variantImageMap[index];
        const oldVariant = oldProduct.variants[index];

        if (imagePath) {
          if (oldVariant?.variantImage) {
            const oldVariantPath = `.${oldVariant.variantImage}`;
            if (fs.existsSync(oldVariantPath)) fs.unlinkSync(oldVariantPath);
          }
          return { ...variant, variantImage: imagePath };
        }

        return {
          ...variant,
          variantImage:
            variant.variantImage || oldVariant?.variantImage || null,
        };
      });
    }

    if (updateData.video === "") updateData.video = null;

    const updatedProduct = await Product.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    // Cập nhật tồn kho vào bảng Inventory tương ứng
    if (updateData.variants && Array.isArray(updateData.variants)) {
      for (const variant of updateData.variants) {
        if (variant.inventory && Array.isArray(variant.inventory)) {
          for (const inv of variant.inventory) {
            await Inventory.findOneAndUpdate(
              { product: updatedProduct._id, sku: variant.sku, branch: inv.branch },
              { $set: { stock: inv.stock || 0 } },
              { upsert: true, new: true }
            );
          }
        }
      }

      // Xóa tồn kho của các biến thể đã bị xóa khỏi sản phẩm
      const activeSkus = updateData.variants.map(v => v.sku);
      await Inventory.deleteMany({
        product: updatedProduct._id,
        sku: { $nin: activeSkus }
      });
    }

    return updatedProduct;
  } catch (error) {
    uploadedFiles.forEach((file) => {
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
    const error = new Error("Sản phẩm không tồn tại");
    error.statusCode = 404;
    throw error;
  }

  // Xóa file ảnh vật lý của sản phẩm chính
  if (product.images && product.images.length > 0) {
    product.images.forEach((imgObj) => {
      if (imgObj.url) {
        const imagePath = `.${imgObj.url}`;
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }
    });
  }

  // Xóa file ảnh vật lý của biến thể
  if (product.variants && product.variants.length > 0) {
    product.variants.forEach((variant) => {
      if (variant.variantImage) {
        const vPath = `.${variant.variantImage}`;
        if (fs.existsSync(vPath)) fs.unlinkSync(vPath);
      }
    });
  }

  await Product.deleteOne(query);
  await Inventory.deleteMany({ product: product._id });
  return true;
};
