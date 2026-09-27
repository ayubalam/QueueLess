import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if MongoDB server is unreachable
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('\n========================================');
    console.error('[Database Error] Failed to connect to MongoDB!');
    console.error(`Target URI: ${mongoURI}`);
    console.error('Please ensure MongoDB service is running locally or provide a valid MONGODB_URI in server/.env');
    console.error('========================================\n');
    process.exit(1);
  }
};
