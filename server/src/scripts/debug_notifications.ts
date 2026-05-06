import mongoose from 'mongoose';
import Notification from '../models/Notification';
import dotenv from 'dotenv';

dotenv.config();

const checkNotifications = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order');
        console.log('Connected to MongoDB');
        
        const count = await Notification.countDocuments();
        console.log(`Total notifications in DB: ${count}`);
        
        if (count > 0) {
            const latest = await Notification.find().sort({ createdAt: -1 }).limit(5);
            console.log('Latest notifications:');
            latest.forEach(n => console.log(`- [${n.createdAt.toISOString()}] ${n.recipient}: ${n.title} (${n.isRead ? 'Read' : 'Unread'})`));
        } else {
            console.log('No notifications found in DB.');
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkNotifications();
