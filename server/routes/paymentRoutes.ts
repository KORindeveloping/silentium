import express from 'express';
import { createCheckoutSession } from '../controllers/paymentController.ts';
import { protect } from '../middleware/authMiddleware.ts';

const router = express.Router();

router.post('/create-checkout-session', protect, createCheckoutSession);

export default router;
