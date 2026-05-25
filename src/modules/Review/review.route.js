import { reviewController } from './review.controller.js';
import { protect } from '../middleware/auth.js'; // Giả định file middleware check login của bạn

const router = express.Router();

// Route công khai: Xem review sản phẩm (Không cần đăng nhập vẫn xem được)
router.get('/product/:productId', reviewController.getFieldsByProduct);

// Các route cần đăng nhập mới thực hiện được
router.post('/product/:productId', protect, reviewController.createReview);
router.delete('/:reviewId', protect, reviewController.deleteReview);

export default router;