import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Route from '../models/Route';

dotenv.config();

const ROUTE_DATA = [
  { name: 'TIRUR' },
  { name: 'PONNANI' },
  { name: 'THRISSUR' },
  { name: 'NILAMBUR' },
  { name: 'KARUVARAKUND' },
  { name: 'VALANCHERY' },
  { name: 'MALAPPURAM' },
  { name: 'PERINTHALMANNA' },
  { name: 'CHELARI' },
  { name: 'MANNARKAD' },
  { name: 'PANDIKKAD' },
  { name: 'AREEKODE' },
  { name: 'CALICUT' },
  { name: 'CHERUPPALASSERY' },
  { name: 'ERNAKULAM' },
  { name: 'PALAKKAD' }
];

const seedRoutes = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ogito-order';
    await mongoose.connect(mongoUri);
    console.log(' Connected to MongoDB');

    // Delete existing routes
    await Route.deleteMany({});
    console.log(' Cleared existing routes');

    // Insert routes
    const routes = await Route.insertMany(ROUTE_DATA);
    console.log(' Seeded routes successfully:');
    console.log('  Total routes:', routes.length);
    
    process.exit(0);
  } catch (error) {
    console.error(' Seed failed:', error);
    process.exit(1);
  }
};

seedRoutes();
