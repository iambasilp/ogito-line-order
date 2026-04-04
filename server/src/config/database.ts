import mongoose from 'mongoose';

export const connectDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI!;
    await mongoose.connect(mongoUri);
    console.log('✓ MongoDB connected successfully');

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✓ MongoDB reconnected');
    });
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  }
};
