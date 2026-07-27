import express from 'express';
const router = express.Router();
import {
    getAllBlogs,
    getBlogBySlug,
    createBlog,
    updateBlog,
    toggleBlogStatus,
    deleteBlog,
    getRelatedBlogs
} from '#blog/blog.controller.js';
import { protect, staffRole } from '#middlewares/auth.middleware.js';

// Route công khai
router.get('/', getAllBlogs);
router.get('/slug/:slug', getBlogBySlug);
router.get('/related', getRelatedBlogs);

// Route quản trị
router.post('/', staffRole, createBlog);
router.route('/:id')
    .put(staffRole, updateBlog)
    .patch(staffRole, toggleBlogStatus)
    .delete(staffRole, deleteBlog);

export default router;