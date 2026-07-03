import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito';

async function migrateCustomerSince() {
  console.log('--- Starting Migration: customerSince ---');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Initial Verification
    const totalCustomers = await Customer.countDocuments();
    const beforeMissingCount = await Customer.countDocuments({ 
      $or: [{ customerSince: { $exists: false } }, { customerSince: null }]
    });
    
    console.log(`\nVerification [Pre-Migration]:`);
    console.log(`Total Customers in database: ${totalCustomers}`);
    console.log(`Customers missing customerSince: ${beforeMissingCount}`);

    if (beforeMissingCount === 0) {
      console.log('\nMigration complete. No records required updating.');
      process.exit(0);
    }

    // 2. Fetch records that need migration
    const customersToMigrate = await Customer.find({ 
      $or: [{ customerSince: { $exists: false } }, { customerSince: null }]
    });

    let updatedCount = 0;
    
    // 3. Normalize legacy timestamps in Node.js instead of $dateTrunc to ensure version compatibility
    console.log(`\nBeginning migration of ${customersToMigrate.length} records...`);
    
    const bulkOps = customersToMigrate.map(customer => {
      // Normalize createdAt to UTC Midnight
      const normalizedDate = new Date(customer._id.getTimestamp()); // Use ObjectId timestamp or createdAt
      normalizedDate.setUTCHours(0, 0, 0, 0);

      return {
        updateOne: {
          filter: { _id: customer._id },
          update: { $set: { customerSince: normalizedDate } }
        }
      };
    });

    if (bulkOps.length > 0) {
      const bulkResult = await Customer.bulkWrite(bulkOps);
      updatedCount = bulkResult.modifiedCount;
    }

    // 4. Post-Migration Verification
    const afterMissingCount = await Customer.countDocuments({ 
      $or: [{ customerSince: { $exists: false } }, { customerSince: null }]
    });
    
    console.log(`\nVerification [Post-Migration]:`);
    console.log(`Customers successfully updated: ${updatedCount}`);
    console.log(`Customers still missing customerSince: ${afterMissingCount}`);

    console.log('\n--- Migration Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('\n--- MIGRATION FAILED ---');
    console.error(error);
    process.exit(1);
  }
}

migrateCustomerSince();
