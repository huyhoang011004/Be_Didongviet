import express from 'express';
import { reviewController } from './review.controller.js';
import { protect } from '#middlewares/auth.middleware.js';

const router = express.Router();

// Route công khai: Xem review sản phẩm (Không cần đăng nhập vẫn xem được)
router.get('/product/:productId', reviewController.getFieldsByProduct);

// Các route cần đăng nhập mới thực hiện được
router.get('/order/:orderId', protect, reviewController.getReviewsByOrder);
router.post('/product/:productId', protect, reviewController.createReview);
router.delete('/:reviewId', protect, reviewController.deleteReview);

export default router;