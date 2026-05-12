import express from 'express';
import { getAdminStats, updateBookStatus, getPayouts, getAdminBooks } from '../controllers/adminController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/stats', protect, admin, getAdminStats);
router.get('/documents', protect, admin, getAdminBooks);
router.patch('/documents/:id/status', protect, admin, updateBookStatus);
router.patch('/books/:id/status', protect, admin, updateBookStatus); // Keep for compatibility
router.get('/payouts', protect, admin, getPayouts);

export default router;
