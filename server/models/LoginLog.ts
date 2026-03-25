import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginLog extends Document {
  userId?: mongoose.Schema.Types.ObjectId;
  email: string;
  status: 'success' | 'failed';
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  timestamp: Date;
}

const LoginLogSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, required: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const LoginLog = mongoose.model<ILoginLog>('LoginLog', LoginLogSchema);
export default LoginLog;
