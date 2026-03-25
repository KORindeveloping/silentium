import express from 'express';
import rateLimit from 'express-rate-limit';
import { registerUser, loginUser, getUserProfile, forgotPassword, updateUserProfile, deleteUserProfile } from '../controllers/authController.ts';
import { protect } from '../middleware/authMiddleware.ts';
import upload from '../middleware/uploadMiddleware.ts';

const router = express.Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.get('/me', protect, getUserProfile);
router.put('/profile', protect, upload.single('avatar'), updateUserProfile);
router.delete('/profile', protect, deleteUserProfile);

export default router;
