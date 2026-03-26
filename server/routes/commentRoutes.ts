import express from 'express';
import { getComments, addComment, deleteComment } from '../controllers/commentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/:bookId')
  .get(getComments)
  .post(protect, addComment);

router.delete('/:id', protect, deleteComment);

export default router;
