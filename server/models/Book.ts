import mongoose, { Document, Schema } from 'mongoose';

export interface IBook extends Document {
  title: string;
  authorId: mongoose.Schema.Types.ObjectId;
  description: string;
  category: string;
  tags: string[];
  fileUrl?: string; // Optional if content is provided
  coverImage?: string; // Changed from coverUrl to match frontend requirements
  content?: string; // For directly written stories
  textSnippet?: string; // For SEO and blurred previews
  pageCount?: number;
  views: number;
  readingMinutes: number;
  likes: mongoose.Schema.Types.ObjectId[]; // Array of user IDs who liked
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
    type: String, // Can be optional now
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
