import express from 'express';
import { getComments, addComment, deleteComment } from '../controllers/commentController.ts';
import { protect } from '../middleware/authMiddleware.ts';

const router = express.Router();

router.route('/:bookId')
  .get(getComments)
  .post(protect, addComment);

router.delete('/:id', protect, deleteComment);

export default router;
