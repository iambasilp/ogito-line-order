import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const checkAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order');
        console.log('Connected to MongoDB');
        
        const admins = await User.find({ role: 'admin' });
        console.log(`Total Admins in DB: ${admins.length}`);
        admins.forEach(a => console.log(`- ${a.username} (${a.role})`));
        
        const allUsers = await User.find();
        console.log(`Total Users in DB: ${allUsers.length}`);
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkAdmins();
