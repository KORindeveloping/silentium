import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: 'reader' | 'author' | 'admin';
  isVerified: boolean;
  name?: string;
  username?: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    activity: boolean;
  };
  verificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  credits: number;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['reader', 'author', 'admin'],
    default: 'reader',
  },
  credits: {
    type: Number,
    default: 0,
  },
  name: String,
  username: {
    type: String,
    unique: true,
    sparse: true,
  },
  phone: String,
  bio: String,
  location: String,
  avatar: String,
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    activity: { type: Boolean, default: true },
  },
  savedBooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  }],
  history: [{
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    progress: { type: Number, default: 0 }, // Percentage or page number
    lastRead: { type: Date, default: Date.now }
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    required: true,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true,
});

// Middleware to hash password before saving
UserSchema.pre<IUser>('save', async function () {
  if (!this.isModified('passwordHash')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
