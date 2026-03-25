import { Request, Response } from 'express';
import Analytics from '../models/Analytics.ts';
import Book from '../models/Book.ts';
import Author from '../models/Author.ts';
import Payout from '../models/Payout.ts';

// @desc    Track reading activity
// @route   POST /api/analytics/track
// @access  Private
export const trackReading = async (req: Request, res: Response) => {
  const { bookId, minutes, pages } = req.body;

  const book = await Book.findById(bookId);

  if (!book) {
    res.status(404).json({ message: 'Book not found' });
    return;
  }

  // Update book total minutes and views
  book.readingMinutes = (book.readingMinutes || 0) + (minutes || 0);
  await book.save();

  // Create analytics record
  await Analytics.create({
    bookId,
    userId: (req as any).user._id,
    minutesRead: minutes || 0,
    pagesRead: pages || 0,
    timestamp: new Date(),
  });

  // Calculate earnings (e.g. $0.05 per minute)
  const earningsPerMinute = 0.05;
  const authorProfile = await Author.findOne({ userId: book.authorId });
  if (authorProfile) {
    authorProfile.earnings += (minutes || 0) * earningsPerMinute;
    await authorProfile.save();
  }

  res.json({ success: true });
};

// @desc    Get author stats
// @route   GET /api/analytics/stats
// @access  Private/Author
export const getAuthorStats = async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  
  // Find author profile
  let authorProfile = await Author.findOne({ userId });
  
  // Create if missing
  if (!authorProfile && (req as any).user.role === 'author') {
    authorProfile = await Author.create({ userId });
  }

  if (!authorProfile) {
     res.status(404).json({ message: 'Author profile not found' });
     return;
  }

  // Find all books by this author
  const books = await Book.find({ authorId: userId });
  const bookIds = books.map(b => b._id);

  const totalReads = books.reduce((acc, b) => acc + (b.views || 0), 0);
  const totalMinutes = books.reduce((acc, b) => acc + (b.readingMinutes || 0), 0);

  // Get unique readers count for all author's books
  const uniqueReadersResult = await Analytics.aggregate([
    { $match: { bookId: { $in: bookIds } } },
    { $group: { _id: null, uniqueUsers: { $addToSet: '$userId' } } },
    { $project: { count: { $size: '$uniqueUsers' } } }
  ]);
  const uniqueReaders = uniqueReadersResult.length > 0 ? uniqueReadersResult[0].count : 0;
  
  // Get real payout history
  const payoutHistory = await Payout.find({ authorId: userId }).sort({ createdAt: -1 });

  res.json({
    totalReads,
    totalMinutes,
    uniqueReaders,
    earnings: authorProfile.earnings || 0,
    bookCount: books.length,
    payoutHistory: payoutHistory.map(p => ({
      id: p._id,
      amount: p.amount,
      status: p.status,
      date: p.date.toLocaleDateString()
    }))
  });
};

// @desc    Request Payout
// @route   POST /api/analytics/payout
// @access  Private/Author
export const requestPayout = async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const authorProfile = await Author.findOne({ userId });

  if (!authorProfile || authorProfile.earnings < 1) {
    return res.status(400).json({ message: 'Minimum payout is $1.00' });
  }

  const amount = authorProfile.earnings;

  // Create Payout Record
  await Payout.create({
    authorId: userId,
    amount,
    status: 'pending',
    date: new Date()
  });

  // Reset Balance
  authorProfile.earnings = 0;
  await authorProfile.save();

  res.json({ message: 'Payout requested successfully', amount });
};
