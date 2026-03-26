import { Request, Response } from 'express';
import Analytics from '../models/Analytics';
import Revenue from '../models/Revenue';
import Payout from '../models/Payout';
import Book from '../models/Book';
import User from '../models/User';
import Author from '../models/Author';

// @desc    Calculate and trigger monthly payouts
// @route   POST /api/revenue/calculate
// @access  Private/Admin
export const calculateMonthlyPayouts = async (req: Request, res: Response) => {
  const { month, adsRevenue, subscriptionRevenue } = req.body; // month as 'YYYY-MM-DD' (1st of month)
  
  const targetMonth = new Date(month);
  targetMonth.setUTCDate(1);
  targetMonth.setUTCHours(0, 0, 0, 0);

  // 1. Create/Update Revenue Record
  let revenueRecord = await Revenue.findOne({ month: targetMonth });
  if (!revenueRecord) {
    revenueRecord = new Revenue({ month: targetMonth });
  }
  revenueRecord.adsRevenue = adsRevenue;
  revenueRecord.subscriptionRevenue = subscriptionRevenue;
  await revenueRecord.save();

  // 2. Get Total Platform Reading Minutes for the month
  const startOfMonth = new Date(targetMonth);
  const endOfMonth = new Date(targetMonth);
  endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);

  const totalMinutesResult = await Analytics.aggregate([
    { $match: { timestamp: { $gte: startOfMonth, $lt: endOfMonth } } },
    { $group: { _id: null, total: { $sum: '$minutesRead' } } }
  ]);
  const totalPlatformMinutes = totalMinutesResult.length > 0 ? totalMinutesResult[0].total : 0;

  if (totalPlatformMinutes === 0) {
    res.status(400).json({ message: 'No reading activity for this month' });
    return;
  }

  // 3. Calculate Share per Author
  const authorStats = await Analytics.aggregate([
    { $match: { timestamp: { $gte: startOfMonth, $lt: endOfMonth } } },
    {
      $lookup: {
        from: 'books',
        localField: 'bookId',
        foreignField: '_id',
        as: 'book'
      }
    },
    { $unwind: '$book' },
    {
      $group: {
        _id: '$book.authorId',
        authorMinutes: { $sum: '$minutesRead' }
      }
    }
  ]);

  const authorPool = revenueRecord.authorPool;
  const payoutLogs = [];

  for (const stats of authorStats) {
    const authorId = stats._id;
    const authorMinutes = stats.authorMinutes;
    const share = (authorMinutes / totalPlatformMinutes) * authorPool;

    // Minimum payout threshold: $50
    if (share >= 50) {
      const payout = await Payout.create({
        authorId,
        amount: share,
        status: 'pending',
        date: new Date()
      });
      payoutLogs.push(payout);

      // Update Author earnings/balance (optional, could be done via Author model)
      await Author.findOneAndUpdate(
        { userId: authorId },
        { $inc: { earnings: share } }
      );
    }
  }

  revenueRecord.processed = true;
  await revenueRecord.save();

  res.json({
    message: 'Monthly payouts calculated',
    totalPlatformMinutes,
    authorPool,
    payoutsCreated: payoutLogs.length,
    payoutLogs
  });
};

// @desc    Get author earnings
// @route   GET /api/revenue/my-earnings
// @access  Private/Author
export const getMyEarnings = async (req: Request, res: Response) => {
  const authorId = (req as any).user._id;
  
  const payouts = await Payout.find({ authorId }).sort({ date: -1 });
  const authorProfile = await Author.findOne({ userId: authorId });

  res.json({
    currentBalance: authorProfile?.earnings || 0,
    payoutHistory: payouts
  });
};

// @desc    Get monthly analytics
// @route   GET /api/revenue/analytics/:month
// @access  Private/Admin
export const getMonthlyAnalytics = async (req: Request, res: Response) => {
  const targetMonth = new Date(req.params.month);
  const startOfMonth = new Date(targetMonth);
  const endOfMonth = new Date(targetMonth);
  endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);

  const stats = await Analytics.aggregate([
    { $match: { timestamp: { $gte: startOfMonth, $lt: endOfMonth } } },
    {
      $group: {
        _id: '$bookId',
        minutes: { $sum: '$minutesRead' },
        pages: { $sum: '$pagesRead' },
        uniqueReaders: { $addToSet: '$userId' }
      }
    },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: '_id',
        as: 'book'
      }
    },
    { $unwind: '$book' },
    {
      $project: {
        bookId: '$_id',
        title: '$book.title',
        minutes: 1,
        pages: 1,
        uniqueReadersCount: { $size: '$uniqueReaders' }
      }
    }
  ]);

  res.json(stats);
};
