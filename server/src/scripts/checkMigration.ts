import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Customer from '../models/Customer';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkMigration() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.\n');

    const totalCustomers = await Customer.countDocuments();
    console.log(`Total Customers in Database: ${totalCustomers}`);

    const customersMissingNewFields = await Customer.countDocuments({
      $or: [
        { customerType: { $exists: false } },
        { customerType: null },
        { customerType: "" },

        { customerStatus: { $exists: false } },
        { customerStatus: null },
        { customerStatus: "" },

        { customerSeason: { $exists: false } },
        { customerSeason: null },
        { customerSeason: "" }
      ]
    });

    console.log(`\n==============================================`);
    console.log(`MIGRATION STATUS`);
    console.log(`==============================================`);
    console.log(`Customers migrated successfully: ${totalCustomers - customersMissingNewFields}`);
    console.log(`Customers MISSING data: ${customersMissingNewFields}`);
    console.log(`==============================================\n`);

    if (customersMissingNewFields === 0) {
      console.log(`✅ SUCCESS! All existing customers have valid values for the new fields.`);
      console.log(`You can now safely change 'required: true' in the Mongoose schema.`);
    } else {
      console.log(`⚠️ WARNING: There are still ${customersMissingNewFields} customers that need to be manually updated in the Admin UI.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error running checkMigration:', error);
    process.exit(1);
  }
}

checkMigration();
