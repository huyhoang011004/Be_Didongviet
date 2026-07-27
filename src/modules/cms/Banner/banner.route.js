import express from 'express';
import {
    getAllBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner
} from './banner.controller.js';
import { adminRole } from '#middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', getAllBanners);
router.get('/:id', getBannerById);

// Admin routes
router.use(...adminRole);

router.post('/', createBanner);
router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

export default router;
