import mongoose from 'mongoose';
import User from './src/models/User';
import GodownTransferModel from './src/models/GodownTransfer';
import GodownModel from './src/models/Godown';

const MONGO_URI = 'mongodb://localhost:27017/ogito-order';

const data = [
  { date: '18-Jul-2026', qty: 160 },
  { date: '21-Jul-2026', qty: 160 },
  { date: '22-Jul-2026', qty: 160 },
  { date: '24-Jul-2026', qty: 160 },
  { date: '25-Jul-2026', qty: 160 },
  { date: '30-Jul-2026', qty: 160 },
  { date: '01-Aug-2026', qty: 320 },
  { date: '03-Aug-2026', qty: 320 },
  { date: '04-Aug-2026', qty: 320 },
  { date: '08-Aug-2026', qty: 160 },
  { date: '10-Aug-2026', qty: 320 },
  { date: '11-Aug-2026', qty: 160 },
  { date: '14-Aug-2026', qty: 160 },
  { date: '15-Aug-2026', qty: 160 },
  { date: '17-Aug-2026', qty: 160 },
  { date: '18-Aug-2026', qty: 320 },
  { date: '19-Aug-2026', qty: 320 },
  { date: '21-Aug-2026', qty: 160 },
  { date: '22-Aug-2026', qty: 310 },
  { date: '24-Aug-2026', qty: 320 },
  { date: '26-Aug-2026', qty: 160 },
  { date: '27-Aug-2026', qty: 160 },
  { date: '29-Aug-2026', qty: 160 },
  { date: '31-Aug-2026', qty: 160 },
  { date: '01-Sep-2026', qty: 160 },
  { date: '09-Sep-2026', qty: 150 },
  { date: '11-Sep-2026', qty: 160 },
  { date: '15-Sep-2026', qty: 160 },
  { date: '16-Sep-2026', qty: 160 },
  { date: '17-Sep-2026', qty: 160 },
  { date: '18-Sep-2026', qty: 150 },
  { date: '19-Sep-2026', qty: 320 },
  { date: '21-Sep-2026', qty: 160 },
  { date: '22-Sep-2026', qty: 160 },
  { date: '23-Sep-2026', qty: 160 },
  { date: '24-Sep-2026', qty: 150 },
  { date: '25-Sep-2026', qty: 320 },
  { date: '26-Sep-2026', qty: 310 },
  { date: '27-Sep-2026', qty: 160 },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  // get admin user
  const admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) throw new Error('No admin found');

  // Ensure locations exist
  await GodownModel.updateOne({ name: 'Manufacturing Godown' }, { $setOnInsert: { name: 'Manufacturing Godown' } }, { upsert: true });
  await GodownModel.updateOne({ name: 'Puthanathani Godown' }, { $setOnInsert: { name: 'Puthanathani Godown' } }, { upsert: true });

  const transfersToInsert = data.map(item => {
    const d = new Date(item.date);
    const dispatchTime = new Date(d);
    dispatchTime.setHours(9, 0, 0, 0); // 9:00 AM
    
    const deliveryTime = new Date(d);
    deliveryTime.setHours(11, 0, 0, 0); // 11:00 AM

    return {
      date: d,
      vehicleNumber: 'KL10 BACKFILL',
      driverName: 'Auto',
      source: 'Manufacturing Godown',
      destination: 'Puthanathani Godown',
      product: 'Standard',
      quantity: item.qty,
      dispatchTime: dispatchTime,
      deliveryTime: deliveryTime,
      status: 'Delivered',
      createdBy: admin._id
    };
  });

  await GodownTransferModel.insertMany(transfersToInsert);
  console.log('Inserted ' + transfersToInsert.length + ' records. Total Boxes: ' + data.reduce((a, b) => a + b.qty, 0));
  
  await mongoose.disconnect();
}
run();
