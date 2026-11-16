import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentCollection extends Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  orderId?: mongoose.Types.ObjectId;
  amount: number;
  paymentMode: 'Cash' | 'UPI';
  date: Date;
  collectedBy: mongoose.Types.ObjectId;
  collectedByUsername: string;
  collectedByName?: string;
  route?: mongoose.Types.ObjectId;
  routeName?: string;
  vehicle?: string;
  notes?: string;
  status: 'Collected' | 'Deposited' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const paymentCollectionSchema = new Schema<IPaymentCollection>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be greater than zero'],
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    collectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collectedByUsername: {
      type: String,
      required: true,
      index: true,
    },
    collectedByName: {
      type: String,
      trim: true,
    },
    route: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      index: true,
    },
    routeName: {
      type: String,
      trim: true,
    },
    vehicle: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Collected', 'Deposited', 'Cancelled'],
      default: 'Collected',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentCollectionSchema.index({ date: -1, collectedByUsername: 1 });
paymentCollectionSchema.index({ customerId: 1, date: -1 });

export default mongoose.model<IPaymentCollection>('PaymentCollection', paymentCollectionSchema);
