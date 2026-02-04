import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order';

async function debugOrders() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const orders = await Order.find({}).limit(5).lean();
    
    console.log('\n--- Sample Orders from Database ---\n');
    orders.forEach((order: any) => {
      console.log(`Order ID: ${order._id}`);
      console.log(`Route value: ${order.route}`);
      console.log(`Route type: ${typeof order.route}`);
      console.log(`Is ObjectId?: ${mongoose.Types.ObjectId.isValid(order.route)}`);
      console.log(`Route length: ${order.route?.toString().length}`);
      console.log('---');
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

debugOrders();
