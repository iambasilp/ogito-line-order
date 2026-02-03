import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  date: Date;
  customerId: mongoose.Types.ObjectId;
  route: string;
  vehicle: string;
  standardQty: number;
  premiumQty: number;
  createdBy: mongoose.Types.ObjectId;
  createdByUsername: string;
}

const orderSchema = new Schema<IOrder>({
  date: {
    type: Date,
    required: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  route: {
    type: String,
    required: true
  },
  vehicle: {
    type: String,
    required: true
  },
  standardQty: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  premiumQty: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByUsername: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IOrder>('Order', orderSchema);
