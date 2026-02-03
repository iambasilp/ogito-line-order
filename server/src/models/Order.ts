import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  date: Date;
  customerId: mongoose.Types.ObjectId;
  salesExecutive: string;
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
  salesExecutive: {
    type: String,
    required: true,
    index: true
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

// Performance indexes for common queries
orderSchema.index({ date: -1 });
orderSchema.index({ salesExecutive: 1, date: -1 });
orderSchema.index({ route: 1, date: -1 });
orderSchema.index({ vehicle: 1, date: -1 });
orderSchema.index({ customerId: 1, date: -1 });

export default mongoose.model<IOrder>('Order', orderSchema);
