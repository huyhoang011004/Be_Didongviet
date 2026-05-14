import express from 'express';
const router = express.Router();
import {
    getAllBlogs,
    getBlogBySlug,
    createBlog,
    updateBlog,
    deleteBlog,
    getRelatedBlogs
} from '../controllers/blogController.js';
import { protect } from '../middlewares/authMiddleware.js';

// Route công khai
router.get('/', getAllBlogs);
router.get('/slug/:slug', getBlogBySlug);
router.get('/related', getRelatedBlogs);

// Route quản trị
router.post('/', protect, createBlog);
router.route('/:id')
    .put(protect, updateBlog)
    .delete(protect, deleteBlog);

export default router;