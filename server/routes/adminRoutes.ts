import express from 'express';
import { getAdminStats, updateBookStatus, getPayouts } from '../controllers/adminController.ts';
import { protect, admin } from '../middleware/authMiddleware.ts';

const router = express.Router();

router.get('/stats', protect, admin, getAdminStats);
router.patch('/books/:id/status', protect, admin, updateBookStatus);
router.get('/payouts', protect, admin, getPayouts);

export default router;
