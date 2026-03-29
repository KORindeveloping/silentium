import mongoose, { Document, Schema } from 'mongoose';

export interface IRevenue extends Document {
  month: Date; // First day of the month
  adsRevenue: number;
  subscriptionRevenue: number;
  totalRevenue: number;
  authorPool: number; // e.g., 60% of totalRevenue
  platformShare: number;
  authorPoolPercentage: number;
  processed: boolean;
}

const RevenueSchema: Schema = new Schema({
  month: {
    type: Date,
    required: true,
    unique: true,
  },
  adsRevenue: {
    type: Number,
    default: 0,
  },
  subscriptionRevenue: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  authorPool: {
    type: Number,
    default: 0,
  },
  platformShare: {
    type: Number,
    default: 0,
  },
  authorPoolPercentage: {
    type: Number,
    default: 60, // Configurable default
  },
  processed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

RevenueSchema.pre<IRevenue>('save', async function () {
  this.totalRevenue = (this.adsRevenue || 0) + (this.subscriptionRevenue || 0);
  this.authorPool = (this.totalRevenue * (this.authorPoolPercentage || 60)) / 100;
  this.platformShare = this.totalRevenue - this.authorPool;
});

const Revenue = mongoose.models.Revenue || mongoose.model<IRevenue>('Revenue', RevenueSchema);
export default Revenue;
