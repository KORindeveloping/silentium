import express from 'express';
import { getAdminStats, updateBookStatus, getPayouts } from '../controllers/adminController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/stats', protect, admin, getAdminStats);
router.patch('/books/:id/status', protect, admin, updateBookStatus);
router.get('/payouts', protect, admin, getPayouts);

export default router;
