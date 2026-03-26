import express from 'express';
import { calculateMonthlyPayouts, getMyEarnings, getMonthlyAnalytics } from '../controllers/revenueController';
import { protect, author, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/calculate', protect, admin, calculateMonthlyPayouts);
router.get('/my-earnings', protect, author, getMyEarnings);
router.get('/analytics/:month', protect, admin, getMonthlyAnalytics);

export default router;
