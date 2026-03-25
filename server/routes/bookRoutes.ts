import express from 'express';
import { getBooks, getBookById, createBook, updateBook, deleteBook, toggleLike } from '../controllers/bookController.ts';
import { protect, author } from '../middleware/authMiddleware.ts';
import upload from '../middleware/uploadMiddleware.ts';

const router = express.Router();

router.route('/')
  .get(getBooks)
  .post(protect, author, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), createBook);

router.route('/:id')
  .get(getBookById)
  .put(protect, author, updateBook)
  .delete(protect, author, deleteBook);

router.route('/:id/like').put(protect, toggleLike);

export default router;
