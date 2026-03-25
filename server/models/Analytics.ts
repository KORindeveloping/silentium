import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  bookId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  minutesRead: number;
  pagesRead: number;
  timestamp: Date;
}

const AnalyticsSchema: Schema = new Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  minutesRead: {
    type: Number,
    required: true,
    default: 0,
  },
  pagesRead: {
    type: Number,
    required: true,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for fast aggregation by book and date
AnalyticsSchema.index({ bookId: 1, timestamp: -1 });
AnalyticsSchema.index({ userId: 1, bookId: 1 });

const Analytics = mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
export default Analytics;
