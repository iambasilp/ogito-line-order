import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';
import { ROLES } from './config/constants';

dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Delete all existing users to reseed with hashed passwords
    const deleteResult = await User.deleteMany({});
    if (deleteResult.deletedCount > 0) {
      console.log(`✓ Deleted ${deleteResult.deletedCount} existing user(s)`);
    }

    // Create default admin with hashed PIN
    const admin = new User({
      username: 'admin',
      pin: '123456', // Will be automatically hashed by pre-save hook
      role: ROLES.ADMIN
    });

    await admin.save();
    
    console.log('✓ Admin user created successfully with hashed PIN');
    console.log('  Username: admin');
    console.log('  PIN: 123456');
    console.log('  ⚠ Please change the PIN after first login');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Seed failed:', error);
    process.exit(1);
  }
};

seedAdmin();
