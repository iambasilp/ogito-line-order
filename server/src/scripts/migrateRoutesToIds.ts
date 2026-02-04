import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer';
import Order from '../models/Order';
import Route from '../models/Route';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order';

async function migrateRoutesToIds() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Get all routes
    const routes = await Route.find({});
    console.log(`\n✓ Found ${routes.length} routes`);

    const routeMap = new Map();
    routes.forEach(route => {
      routeMap.set(route.name.toUpperCase(), route._id);
      console.log(`  - ${route.name}: ${route._id}`);
    });

    // Migrate Customers
    console.log('\n--- Migrating Customers ---');
    const customers = await Customer.find({}).lean();
    console.log(`Found ${customers.length} customers to check`);

    let customersMigrated = 0;
    let customersSkipped = 0;
    let customersFailed = 0;

    for (const customer of customers) {
      try {
        // Check if already migrated (route is ObjectId with 24 chars)
        if (mongoose.Types.ObjectId.isValid(customer.route as any) && 
            customer.route.toString().length === 24) {
          customersSkipped++;
          continue;
        }

        const routeName = (customer.route as any).toString().toUpperCase();
        const routeId = routeMap.get(routeName);

        if (routeId) {
          await Customer.updateOne(
            { _id: customer._id },
            { $set: { route: routeId } }
          );
          customersMigrated++;
        } else {
          console.error(`  ⚠️  Route not found for customer "${customer.name}": ${routeName}`);
          customersFailed++;
        }
      } catch (error) {
        console.error(`  ❌ Error migrating customer ${customer.name}:`, error);
        customersFailed++;
      }
    }

    console.log(`\n✓ Customers migrated: ${customersMigrated}`);
    console.log(`✓ Customers skipped (already migrated): ${customersSkipped}`);
    if (customersFailed > 0) {
      console.log(`⚠️  Customers failed: ${customersFailed}`);
    }

    // Migrate Orders
    console.log('\n--- Migrating Orders ---');
    const orders = await Order.find({}).lean();
    console.log(`Found ${orders.length} orders to check`);

    let ordersMigrated = 0;
    let ordersSkipped = 0;
    let ordersFailed = 0;

    for (const order of orders) {
      try {
        // Check if already migrated
        if (mongoose.Types.ObjectId.isValid(order.route as any) && 
            order.route.toString().length === 24) {
          ordersSkipped++;
          continue;
        }

        const routeName = (order.route as any).toString().toUpperCase();
        const routeId = routeMap.get(routeName);

        if (routeId) {
          await Order.updateOne(
            { _id: order._id },
            { $set: { route: routeId } }
          );
          ordersMigrated++;
        } else {
          console.error(`  ⚠️  Route not found for order ${order._id}: ${routeName}`);
          ordersFailed++;
        }
      } catch (error) {
        console.error(`  ❌ Error migrating order ${order._id}:`, error);
        ordersFailed++;
      }
    }

    console.log(`\n✓ Orders migrated: ${ordersMigrated}`);
    console.log(`✓ Orders skipped (already migrated): ${ordersSkipped}`);
    if (ordersFailed > 0) {
      console.log(`⚠️  Orders failed: ${ordersFailed}`);
    }

    console.log('\n✅ Migration completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateRoutesToIds();
