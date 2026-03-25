import express from 'express';
import { toggleSaveBook, toggleFollowUser, getUserLibrary } from '../controllers/userController.ts';
import { protect } from '../middleware/authMiddleware.ts';

const router = express.Router();

router.put('/library/:id', protect, toggleSaveBook);
router.get('/library', protect, getUserLibrary);
router.put('/follow/:id', protect, toggleFollowUser);

export default router;
