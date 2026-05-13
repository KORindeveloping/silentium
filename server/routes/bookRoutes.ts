import express from 'express';
import { getBooks, getBookById, createBook, updateBook, deleteBook, toggleLike, streamBookFile } from '../controllers/bookController';
import { protect, optionalProtect, author } from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';
import { asyncHandler } from '../middleware/asyncHandler';

const router = express.Router();

router.get('/:id/file', optionalProtect, asyncHandler(streamBookFile));

router.route('/')
  .get(asyncHandler(getBooks))
  .post(
    protect, 
    author, 
    upload.fields([{ name: 'file', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), 
    asyncHandler(createBook)
  );

router.route('/:id')
  .get(asyncHandler(getBookById))
  .put(protect, author, asyncHandler(updateBook))
  .delete(protect, author, asyncHandler(deleteBook));

router.route('/:id/like').put(protect, asyncHandler(toggleLike));

export default router;
