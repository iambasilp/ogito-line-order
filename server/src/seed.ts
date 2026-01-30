import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';
import { ROLES } from './config/constants';

dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: ROLES.ADMIN });
    
    if (existingAdmin) {
      console.log('ℹ Admin user already exists');
      console.log(`  Username: ${existingAdmin.username}`);
      process.exit(0);
    }

    // Create default admin
    const admin = new User({
      username: 'admin',
      pin: '123456',
      role: ROLES.ADMIN
    });

    await admin.save();
    
    console.log('✓ Admin user created successfully');
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
