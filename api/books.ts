import { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Configure environment
dotenv.config();

// Database connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not configured');
    }
    
    await mongoose.connect(mongoUri);
    isConnected = true;
    console.log('MongoDB Connected (Vercel Books API)');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    throw error;
  }
};

// Import Book model
import Book from '../server/models/Book';

// Books API handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Connect to database
    await connectDB();

    const { method, query } = req;

    if (method === 'GET') {
      const pageSize = Number(query.limit) || 12;
      const page = Number(query.page) || 1;
      const sortBy = query.sort || 'latest';

      const queryObj: any = {};
      if (query.q) {
        queryObj.$or = [
          { title: { $regex: query.q, $options: 'i' } },
          { description: { $regex: query.q, $options: 'i' } },
          { tags: { $regex: query.q, $options: 'i' } }
        ];
      }
      if (query.category && query.category !== 'All') {
        queryObj.category = query.category;
      }
      queryObj.status = 'published';
      queryObj.visibility = 'public';

      let sortOptions: any = { createdAt: -1 };
      if (sortBy === 'popular') sortOptions = { views: -1 };
      else if (sortBy === 'trending') sortOptions = { views: -1, createdAt: -1 };

      const count = await Book.countDocuments(queryObj);
      const books = await Book.find(queryObj)
        .populate('authorId', 'name email avatar credits')
        .sort(sortOptions)
        .limit(pageSize)
        .skip(pageSize * (page - 1));

      const formattedBooks = books.map((book: any) => ({
        _id: book._id,
        title: book.title,
        description: book.description,
        category: book.category,
        tags: book.tags,
        author: {
          _id: book.authorId?._id,
          name: book.authorId?.name || book.authorId?.email?.split('@')[0] || 'Unknown',
          avatar: book.authorId?.avatar,
          credits: book.authorId?.credits
        },
        coverImage: book.coverImage,
        fileUrl: book.fileUrl,
        content: book.content,
        pageCount: book.pageCount,
        views: book.views,
        likes: book.likes?.length || 0,
        readingMinutes: book.readingMinutes,
        status: book.status,
        visibility: book.visibility,
        createdAt: book.createdAt,
      }));

      return res.json({ 
        success: true,
        books: formattedBooks, 
        page, 
        pages: Math.ceil(count / pageSize), 
        total: count 
      });
    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }
  } catch (error: any) {
    console.error('Books API Error:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    });
  }
}
