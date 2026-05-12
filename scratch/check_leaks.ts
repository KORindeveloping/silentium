import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../server/models/Book.js';

dotenv.config();

async function checkCloudinaryLeaks() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    const leaks = await Book.find({ 
      fileUrl: { $regex: /res\.cloudinary\.com/ } 
    }).select('title fileUrl');
    
    if (leaks.length > 0) {
      console.log('🚨 FOUND CLOUDINARY LEAKS IN DB:');
      leaks.forEach(l => console.log(`- ${l.title}: ${l.fileUrl}`));
    } else {
      console.log('✅ No Cloudinary leaks found in fileUrl field.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCloudinaryLeaks();
