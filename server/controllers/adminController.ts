import { Request, Response } from 'express';
import Book from '../models/Book.ts';
import User from '../models/User.ts';
import Revenue from '../models/Revenue.ts';
import Payout from '../models/Payout.ts';

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req: Request, res: Response) => {
  const totalUsers = await User.countDocuments();
  const totalBooks = await Book.countDocuments();
  const pendingBooks = await Book.countDocuments({ status: 'pending' });
  
  // Sum total revenue
  const revenueAgg = await Revenue.aggregate([
    { $group: { _id: null, total: { $sum: '$totalRevenue' } } }
  ]);
  const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

  res.json({
    totalUsers,
    totalBooks,
    pendingBooks,
    totalRevenue
  });
};

// @desc    Update book status
// @route   PATCH /api/admin/books/:id/status
// @access  Private/Admin
export const updateBookStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const book = await Book.findById(req.params.id);

  if (book) {
    book.status = status;
    await book.save();
    res.json(book);
  } else {
    res.status(404).json({ message: 'Book not found' });
  }
};

// @desc    Get payouts
// @route   GET /api/admin/payouts
// @access  Private/Admin
export const getPayouts = async (req: Request, res: Response) => {
  const payouts = await Payout.find({}).populate('authorId', 'email');
  res.json(payouts);
};
