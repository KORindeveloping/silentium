import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Book from '../server/models/Book.js';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');

    const books = await Book.find({ storageType: { $exists: false }, fileUrl: { $exists: true, $ne: null } });
    console.log(`Found ${books.length} books to migrate`);

    for (const book of books) {
      if (book.fileUrl.includes('cloudinary')) {
        book.storageType = 'cloudinary';
        // Extract public ID from Cloudinary URL
        // URL: https://res.cloudinary.com/cloud_name/image/upload/v12345/public_id.pdf
        const parts = book.fileUrl.split('/');
        const uploadIdx = parts.indexOf('upload');
        if (uploadIdx !== -1 && uploadIdx + 2 < parts.length) {
           // We take everything after the version
           book.fileKey = parts.slice(uploadIdx + 2).join('/').split('.')[0];
        }
      } else {
        book.storageType = 'local';
        book.fileKey = book.fileUrl.replace(/\\/g, '/');
      }
      await book.save();
      console.log(`Migrated: ${book.title}`);
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
