import express from 'express';
import { reviewController } from './review.controller.js';
import { protect } from '#middlewares/auth.middleware.js';
import upload from '#middlewares/upload.middleware.js';

const router = express.Router();

// Multer fields cho review: tối đa 6 ảnh + 1 video
const reviewUpload = upload.fields([
    { name: 'reviewImages', maxCount: 6 },
    { name: 'reviewVideo', maxCount: 1 },
]);

// Route công khai: Xem review sản phẩm (Không cần đăng nhập vẫn xem được)
router.get('/product/:productId', reviewController.getFieldsByProduct);

// Các route cần đăng nhập mới thực hiện được
router.get('/order/:orderId', protect, reviewController.getReviewsByOrder);
router.post('/product/:productId', protect, reviewUpload, reviewController.createReview);
router.delete('/:reviewId', protect, reviewController.deleteReview);

export default router;
