import * as productService from "#product/product.admin.service.js";
import Product from "./Product.model.js";
import fs from "fs";
import path from "path";
export const createProduct = async (req, res) => {
  try {
    if (req.productId) {
      req.body._id = req.productId;
    }
    const newProduct = await productService.createProductService(
      req.body,
      req.files,
    );

    return res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      data: newProduct,
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error?.message || error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Mã SKU hoặc slug đã tồn tại!",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Cập nhật tồn kho / Cấu hình ngưỡng cảnh báo
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProduct = await productService.updateProductService(
      id,
      req.body,
      req.files,
    );

    return res.json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error?.message || error);
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.deleteProductService(id);

    return res.json({
      success: true,
      message: "Đã xóa sản phẩm và các tệp liên quan thành công",
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const isActiveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (product) {
      product.isActive = !product.isActive;
      await product.save();
    }

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    return res.json({
      success: true,
      message: product.isActive
        ? "Đã kích hoạt sản phẩm thành công"
        : "Đã chuyển trạng thái sản phẩm sang ngừng kinh doanh (xóa mềm)",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
