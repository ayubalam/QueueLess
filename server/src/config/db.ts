import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.log('[Database] MONGODB_URI is not set. Skipping database connection initialization.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('[Database] MongoDB Connection Error:', error);
    process.exit(1);
  }
};
