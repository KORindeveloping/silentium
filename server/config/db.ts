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
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
        console.log(`MongoDB Connected (Cloud)`);
      } catch (err) {
        // Enhanced error handling for production debugging
        const errorMessage = (err as Error).message;
        console.error(`Cloud MongoDB connection failed. Error details:`, {
          error: errorMessage,
          mongoUri: mongoUri ? 'configured' : 'missing',
          environment: process.env.NODE_ENV || 'unknown',
          timestamp: new Date().toISOString()
        });
        
        // Always fall back to in-memory database for production stability
        console.log('Falling back to In-Memory MongoDB for production stability...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const fallbackUri = mongoServer.getUri();
        await mongoose.connect(fallbackUri);
        console.log(`Fallback MongoDB Connected (In-Memory)`);
      }
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${(error as Error).message}`);
    throw error;
  }
};

export default connectDB;
