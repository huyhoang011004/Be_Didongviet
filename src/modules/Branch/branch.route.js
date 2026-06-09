import express from 'express';
import * as branchController from './branch.controller.js';
import { protect, adminRole } from '#middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
    .get(branchController.getAllBranches)
    .post(protect, adminRole, branchController.createBranch);

router.route('/:id')
    .get(branchController.getBranch)
    .patch(protect, adminRole, branchController.updateBranch)
    .delete(protect, adminRole, branchController.deleteBranch);

// Route lấy tồn kho tại chi nhánh
router.get('/:id/inventory', branchController.getBranchInventory);

export default router;