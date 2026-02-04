import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer';
import Order from '../models/Order';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order';

async function fixCustomerOrders() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Get all customers
    const customers = await Customer.find({});
    console.log(`\nFound ${customers.length} customers`);

    let updated = 0;

    for (const customer of customers) {
      // Update all orders for this customer to have the customer's current route
      const result = await Order.updateMany(
        { customerId: customer._id },
        { $set: { route: customer.route } }
      );

      if (result.modifiedCount > 0) {
        console.log(`✓ Updated ${result.modifiedCount} orders for customer "${customer.name}"`);
        updated += result.modifiedCount;
      }
    }

    console.log(`\n✅ Fixed ${updated} orders total`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fix error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixCustomerOrders();
