import Review from './Review.model.js';
import Product from '#product/Product.model.js';
import Order from '#order/Order.model.js';

export const reviewController = {
    // 1. TẠO MỚI HOẶC SỬA REVIEW / REPLY
    createReview: async (req, res) => {
        try {
            const { productId } = req.params;
            const { rating, content, images, parentId, orderId } = req.body;
            const userId = req.user._id;

            // Kiểm tra xem sản phẩm có tồn tại không
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm này' });
            }

            // Nếu là reply, kiểm tra comment gốc có tồn tại không
            if (parentId) {
                const parentReview = await Review.findById(parentId);
                if (!parentReview) {
                    return res.status(404).json({ success: false, message: 'Bình luận gốc không tồn tại' });
                }
            } else {
                // Đánh giá gốc bắt buộc phải liên kết với đơn hàng
                if (!orderId) {
                    return res.status(400).json({ success: false, message: 'Yêu cầu mã đơn hàng để gửi đánh giá' });
                }
                const order = await Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng tương ứng' });
                }
                if (order.orderStatus !== 'Đã giao') {
                    return res.status(400).json({ success: false, message: 'Đơn hàng chưa ở trạng thái Đã giao' });
                }

                // Kiểm tra giới hạn 30 ngày kể từ lúc giao hàng thành công
                const thirtyDays = 30 * 24 * 60 * 60 * 1000;
                const isAfter30Days = order.deliveredAt
                    ? Date.now() - new Date(order.deliveredAt).getTime() > thirtyDays
                    : false;

                if (isAfter30Days) {
                    return res.status(400).json({ success: false, message: 'Đã quá thời hạn 30 ngày kể từ lúc nhận hàng, không thể viết hoặc sửa đánh giá' });
                }

                // Sửa đánh giá: Nếu đã tồn tại đánh giá cho sản phẩm dưới đơn hàng này, cập nhật đánh giá cũ
                const existingReview = await Review.findOne({ order: orderId, product: productId, user: userId, parentId: null });
                if (existingReview) {
                    existingReview.rating = rating;
                    existingReview.content = content;
                    existingReview.images = images || [];
                    await existingReview.save();
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Sửa đánh giá sản phẩm thành công',
                        data: existingReview
                    });
                }
            }

            const newReview = await Review.create({
                product: productId,
                user: userId,
                order: parentId ? undefined : orderId,
                rating: parentId ? undefined : rating,
                content,
                images,
                parentId: parentId || null
            });

            return res.status(201).json({
                success: true,
                message: parentId ? 'Phản hồi thành công' : 'Đánh giá sản phẩm thành công',
                data: newReview
            });
        } catch (error) {
            // Xử lý lỗi trùng lặp
            if (error.code === 11000) {
                return res.status(400).json({ success: false, message: 'Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi' });
            }
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 2. LẤY DANH SÁCH REVIEW CỦA MỘT SẢN PHẨM (Có phân trang & lấy kèm reply)
    getFieldsByProduct: async (req, res) => {
        try {
            const { productId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5; // Mặc định hiển thị 5 comment một trang
            const skip = (page - 1) * limit;

            // Lấy danh sách các comment gốc (parentId là null) trước
            const rootReviews = await Review.find({ product: productId, parentId: null, isApproved: true })
                .populate('user', 'name avatar') // Chỉ lấy tên và avatar của người dùng để bảo mật thông tin
                .sort({ createdAt: -1 }) // Comment mới nhất lên đầu
                .skip(skip)
                .limit(limit);

            const totalReviews = await Review.countDocuments({ product: productId, parentId: null, isApproved: true });

            // Tìm kiếm các reply tương ứng với danh sách comment gốc vừa lấy được
            const rootReviewIds = rootReviews.map(r => r._id);
            const replies = await Review.find({ parentId: { $in: rootReviewIds }, isApproved: true })
                .populate('user', 'name avatar role') // Có thể hiển thị thêm role (Admin/Staff) của người phản hồi
                .sort({ createdAt: 1 }); // Reply xếp theo thứ tự thời gian tăng dần

            // Gộp reply vào đúng comment gốc của nó để Frontend dễ render cây thư mục
            const reviewTree = rootReviews.map(review => {
                const reviewObj = review.toObject();
                reviewObj.replies = replies.filter(reply => reply.parentId.toString() === review._id.toString());
                return reviewObj;
            });

            return res.status(200).json({
                success: true,
                pagination: {
                    totalItems: totalReviews,
                    totalPages: Math.ceil(totalReviews / limit),
                    currentPage: page,
                    limit
                },
                data: reviewTree
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 3. XÓA REVIEW (Dành cho User tự xóa của mình hoặc Admin xóa comment tiêu cực)
    deleteReview: async (req, res) => {
        try {
            const { reviewId } = req.params;
            const userId = req.user._id;
            const userRole = req.user.role; // Giả định hệ thống phân quyền của bạn có trường role

            const review = await Review.findById(reviewId);
            if (!review) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận này' });
            }

            // Bảo mật: Chỉ chính chủ comment đó hoặc tài khoản Admin mới được quyền xóa
            if (review.user.toString() !== userId.toString() && userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa bình luận này' });
            }

            // Dùng findOneAndDelete kích hoạt Middleware cập nhật lại tổng điểm bên Product
            await Review.findOneAndDelete({ _id: reviewId });

            // Nếu xóa comment gốc, tự động xóa luôn tất cả các reply đi kèm bên dưới
            if (review.parentId === null) {
                await Review.deleteMany({ parentId: reviewId });
            }

            return res.status(200).json({ success: true, message: 'Xóa bình luận thành công' });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 4. LẤY ĐÁNH GIÁ CỦA MỘT ĐƠN HÀNG (Dành cho việc hiển thị / chỉnh sửa trên FE)
    getReviewsByOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const userId = req.user._id;
            const reviews = await Review.find({ order: orderId, user: userId, parentId: null });
            return res.status(200).json({ success: true, data: reviews });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};