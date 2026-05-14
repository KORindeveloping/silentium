import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from './server/models/Book.js';

dotenv.config();

const checkBook = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');

    const id = '6a055f96852da08f3cf1445f';
    const book = await Book.findById(id);
    
    if (!book) {
      console.log('Book not found');
    } else {
      console.log('Raw Book Data:', JSON.stringify(book.toObject(), null, 2));
      console.log('fileUrl:', book.fileUrl);
      console.log('fileKey:', book.fileKey);
      console.log('storageType:', book.storageType);
      
      const b = book;
      const fileType = b.fileUrl?.toLowerCase().endsWith('.pdf') || b.fileKey?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other';
      console.log('Calculated fileType:', fileType);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkBook();
