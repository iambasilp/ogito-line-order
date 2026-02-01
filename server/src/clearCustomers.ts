import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './models/Customer';

dotenv.config();

const clearCustomers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Delete all customers
    const deleteResult = await Customer.deleteMany({});
    
    if (deleteResult.deletedCount > 0) {
      console.log(`✓ Successfully deleted ${deleteResult.deletedCount} customer(s)`);
    } else {
      console.log('✓ No customers found to delete');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Clear customers failed:', error);
    process.exit(1);
  }
};

clearCustomers();
