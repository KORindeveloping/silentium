export interface Book {
  _id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  coverImage?: string;
  fileUrl?: string;
  content?: string;
  pageCount?: number;
  views: number;
  likes: number;
  isLiked?: boolean;
  readingMinutes: number;
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'archived' | 'published';
  visibility: 'public' | 'private';
  createdAt: string;
}

// Keep Document for backward compatibility if needed, but alias it to Book
export type Document = Book;

export interface AuthorStats {
  totalReads: number;
  totalMinutes: number;
  estimatedEarnings: number;
  balance: number;
  payoutHistory?: Payout[];
}

export interface Payout {
  id: string;
  authorId: string;
  amount: number;
  status: 'pending' | 'paid';
  date: string;
}

export interface User {
  _id: string;
  email: string;
  role: 'reader' | 'author' | 'admin';
  name?: string;
  avatar?: string;
  credits: number;
  streak?: number;
  longestStreak?: number;
  lastLostStreak?: number;
  isPremium?: boolean; // Derived from subscription status ideally
}

export type Category = 'All' | 'Legal' | 'Academic' | 'Technical' | 'Guides' | 'Research' | 'Other';
