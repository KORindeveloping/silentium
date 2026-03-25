import express from 'express';
import { trackReading, getAuthorStats, requestPayout } from '../controllers/analyticsController.ts';
import { protect, author } from '../middleware/authMiddleware.ts';

const router = express.Router();

router.post('/track', protect, trackReading);
router.get('/stats', protect, author, getAuthorStats);
router.post('/payout', protect, author, requestPayout);

export default router;
