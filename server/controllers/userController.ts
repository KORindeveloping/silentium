import { Request, Response } from 'express';
import User from '../models/User';
import Book from '../models/Book';

// @desc    Toggle Save Book
// @route   PUT /api/users/library/:id
// @access  Private
export const toggleSaveBook = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user._id);
    const bookId = req.params.id;

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Book not found' });

    const isSaved = user.savedBooks.includes(bookId as any);

    if (isSaved) {
      user.savedBooks = user.savedBooks.filter(id => id.toString() !== bookId);
    } else {
      user.savedBooks.push(bookId as any);
    }

    await user.save();
    res.json({ savedBooks: user.savedBooks, isSaved: !isSaved });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Follow/Unfollow User
// @route   PUT /api/users/follow/:id
// @access  Private
export const toggleFollowUser = async (req: Request, res: Response) => {
  try {
    const currentUser = await User.findById((req as any).user._id);
    const targetUserId = req.params.id;

    if (currentUser?._id.toString() === targetUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!currentUser || !targetUser) return res.status(404).json({ message: 'User not found' });

    const isFollowing = currentUser.following.includes(targetUserId as any);

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUser._id.toString());
    } else {
      currentUser.following.push(targetUserId as any);
      targetUser.followers.push(currentUser._id as any);
    }

    await Promise.all([currentUser.save(), targetUser.save()]);
    res.json({ following: currentUser.following, isFollowing: !isFollowing });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get User Library (Saved & History)
// @route   GET /api/users/library
// @access  Private
export const getUserLibrary = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user._id)
      .populate({
        path: 'savedBooks',
        populate: { path: 'authorId', select: 'name email avatar' }
      })
      .populate({
        path: 'history.bookId',
        populate: { path: 'authorId', select: 'name email avatar' }
      });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      saved: user.savedBooks,
      history: user.history.sort((a: any, b: any) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
