import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../server/models/Book.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function purgeLegacyUrls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected.');

    console.log('Searching for books with legacy fileUrl...');
    const booksWithUrl = await Book.find({ fileUrl: { $exists: true, $ne: '' } });
    console.log(`Found ${booksWithUrl.length} books.`);

    if (booksWithUrl.length === 0) {
      console.log('No legacy URLs to purge.');
      process.exit(0);
    }

    console.log('Ensuring all books have fileKey before purging fileUrl...');
    for (const book of booksWithUrl) {
      if (!book.fileKey && book.fileUrl) {
         // Convert Cloudinary URL to fileKey if missing
         if (book.fileUrl.includes('cloudinary.com')) {
           const parts = book.fileUrl.split('/');
           const fileName = parts[parts.length - 1];
           const publicId = fileName.split('.')[0];
           book.fileKey = `books/files/${publicId}`;
           book.storageType = 'cloudinary';
         } else {
           // Local file
           book.fileKey = book.fileUrl.replace('uploads/', '').replace(/\\/g, '/');
           book.storageType = 'local';
         }
         await book.save();
         console.log(`Updated book ${book._id} with fileKey: ${book.fileKey}`);
      }
    }

    console.log('Purging fileUrl field from all documents...');
    const result = await Book.updateMany(
      {}, 
      { $unset: { fileUrl: 1 } }
    );

    console.log(`Purge complete. Modified ${result.modifiedCount} documents.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

purgeLegacyUrls();
