import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    // Use a real MongoDB if a URI is provided in .env
    // Otherwise, start an in-memory database for a zero-config experience
    if (!mongoUri || mongoUri === 'mongodb://localhost:27017/silentium') {
      if (process.env.VERCEL) {
        throw new Error('CONFIGURATION_ERROR: The MONGO_URI environment variable is not defined in Vercel. Please add it to your Project Settings > Environment Variables.');
      }
      try {
        // Test real connection first
        await mongoose.connect(mongoUri || 'mongodb://localhost:27017/silentium', { serverSelectionTimeoutMS: 2000 });
        console.log(`MongoDB Connected (Local)`);
      } catch (err) {
        console.log('Local MongoDB not found. Starting In-Memory MongoDB...');
        // Dynamic import to prevent loading on Vercel
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        console.log(`Virtual MongoDB Connected (In-Memory)`);
      }
    } else {
      console.log(`Connecting to Cloud MongoDB: ${mongoUri.split('@')[1] || 'URL HIDDEN'}`);
      await mongoose.connect(mongoUri);
      console.log(`MongoDB Connected (Cloud)`);
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${(error as Error).message}`);
    throw error;
  }
};

export default connectDB;
