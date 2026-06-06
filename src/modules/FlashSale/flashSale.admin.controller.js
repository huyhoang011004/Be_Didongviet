import FlashSale from '#flashSale/FlashSale.model.js';

// Lấy danh sách Flash Sale cho Admin (phân trang)
export const getAllFlashSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await FlashSale.countDocuments();
    const flashSales = await FlashSale.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('products.product', 'name price images');

    res.status(200).json({
      success: true,
      data: flashSales,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCount: total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Chi tiết Flash Sale
export const getFlashSaleById = async (req, res) => {
  try {
    const flashSale = await FlashSale.findById(req.params.id)
      .populate('products.product', 'name price images variants');

    if (!flashSale) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt Flash Sale.' });
    }

    res.status(200).json({ success: true, data: flashSale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tạo mới Flash Sale
export const createFlashSale = async (req, res) => {
  try {
    const { name, startDate, endDate, timeSlots, duration, products } = req.body;

    if (!name || !startDate || !endDate || !timeSlots || timeSlots.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc.' });
    }

    // Kiểm tra sản phẩm trùng lặp
    if (products && products.length > 0) {
      const productIds = products.map(p => p.product);
      const uniqueProductIds = [...new Set(productIds)];
      if (productIds.length !== uniqueProductIds.length) {
        return res.status(400).json({ success: false, message: 'Danh sách sản phẩm không được trùng lặp.' });
      }
    }

    const newFlashSale = await FlashSale.create({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      timeSlots,
      duration: duration || 60,
      products: products || [],
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    res.status(201).json({ success: true, data: newFlashSale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Cập nhật Flash Sale
export const updateFlashSale = async (req, res) => {
  try {
    const { name, startDate, endDate, timeSlots, duration, products, isActive } = req.body;

    const flashSale = await FlashSale.findById(req.params.id);
    if (!flashSale) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt Flash Sale.' });
    }

    // Kiểm tra sản phẩm trùng lặp
    if (products && products.length > 0) {
      const productIds = products.map(p => p.product);
      const uniqueProductIds = [...new Set(productIds)];
      if (productIds.length !== uniqueProductIds.length) {
        return res.status(400).json({ success: false, message: 'Danh sách sản phẩm không được trùng lặp.' });
      }
    }

    if (name) flashSale.name = name;
    if (startDate) flashSale.startDate = new Date(startDate);
    if (endDate) flashSale.endDate = new Date(endDate);
    if (timeSlots) flashSale.timeSlots = timeSlots;
    if (duration !== undefined) flashSale.duration = duration;
    if (products) flashSale.products = products;
    if (isActive !== undefined) flashSale.isActive = isActive;

    await flashSale.save();
    res.status(200).json({ success: true, data: flashSale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xóa Flash Sale
export const deleteFlashSale = async (req, res) => {
  try {
    const flashSale = await FlashSale.findByIdAndDelete(req.params.id);
    if (!flashSale) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt Flash Sale để xóa.' });
    }
    res.status(200).json({ success: true, message: 'Đã xóa đợt Flash Sale thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bật/tắt trạng thái hoạt động của Flash Sale
export const toggleFlashSaleStatus = async (req, res) => {
  try {
    const flashSale = await FlashSale.findById(req.params.id);
    if (!flashSale) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đợt Flash Sale.' });
    }

    flashSale.isActive = !flashSale.isActive;
    await flashSale.save();

    res.status(200).json({
      success: true,
      message: `Đã ${flashSale.isActive ? 'kích hoạt' : 'hủy kích hoạt'} đợt Flash Sale thành công.`,
      data: flashSale
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
