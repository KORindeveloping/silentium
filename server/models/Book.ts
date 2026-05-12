import mongoose, { Document, Schema } from 'mongoose';

export interface IBook extends Document {
  title: string;
  authorId: mongoose.Schema.Types.ObjectId;
  description: string;
  category: string;
  tags: string[];
  fileUrl?: string; // Kept for legacy/compatibility
  fileKey?: string; // New: Cloudinary public ID or local path
  storageType?: 'cloudinary' | 'local'; // New
  coverImage?: string;
  content?: string;
  textSnippet?: string;
  pageCount?: number;
  views: number;
  readingMinutes: number;
  likes: mongoose.Schema.Types.ObjectId[];
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'archived' | 'published';
  visibility: 'public' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  textSnippet: {
    type: String,
    default: '',
  },
  pageCount: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
  }],
  fileUrl: {
    type: String, // LEGACY: Do not use for new features. Use proxy endpoint instead.
  },
  fileKey: {
    type: String, // Cloudinary Public ID or Local Path
  },
  storageType: {
    type: String, // 'cloudinary' or 'local'
    enum: ['cloudinary', 'local'],
  },
  coverImage: {
    type: String,
    default: '',
  },
  content: {
    type: String, // For stories written directly in the editor
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'draft', 'archived', 'published'],
    default: 'published', // Changed default to published for smoother MVP flow
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public',
  },
  views: {
    type: Number,
    default: 0,
  },
  readingMinutes: {
    type: Number,
    default: 0,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
}, {
  timestamps: true,
});

// Index for search
BookSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Book = mongoose.models.Book || mongoose.model<IBook>('Book', BookSchema);
export default Book;
