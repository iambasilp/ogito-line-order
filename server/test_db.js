const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const orderSchema = new mongoose.Schema({
  deliveryStatus: { type: String, enum: ['Pending', 'Delivered'], default: 'Pending' }
}, { strict: false });

const Order = mongoose.model('Order', orderSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const orders = await Order.find().limit(5);
  orders.forEach(o => console.log('Order:', o._id, 'Status:', o.deliveryStatus));
  
  process.exit(0);
}

run();
