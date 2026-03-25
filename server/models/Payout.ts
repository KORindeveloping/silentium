import mongoose, { Document, Schema } from 'mongoose';

export interface IPayout extends Document {
  authorId: mongoose.Schema.Types.ObjectId;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  date: Date;
}

const PayoutSchema: Schema = new Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  date: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const Payout = mongoose.model<IPayout>('Payout', PayoutSchema);
export default Payout;
