import { Request, Response } from 'express';
import Comment from '../models/Comment';

// @desc    Get comments for a book
// @route   GET /api/comments/:bookId
// @access  Public
export const getComments = async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ bookId: req.params.bookId })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Add a comment
// @route   POST /api/comments/:bookId
// @access  Private
export const addComment = async (req: Request, res: Response) => {
  try {
    const { content, parentId } = req.body;
    const comment = await Comment.create({
      bookId: req.params.bookId,
      userId: (req as any).user._id,
      content,
      parentId: parentId || null
    });
    
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'name email avatar');
    res.status(201).json(populatedComment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.userId.toString() !== (req as any).user._id.toString() && (req as any).user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await comment.deleteOne();
    res.json({ message: 'Comment removed' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
