import mongoose, { Document, Schema } from 'mongoose';

export interface IReceipt extends Document {
  orderId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  isCustom: boolean;
  orderCustomer: string;
  orderRoute: string;
  orderVehicle?: string;
  orderExecutive?: string;
  orderTotal?: number;
  amount: number;
  paymentType: 'Cash' | 'UPI / PhonePe / GPay' | 'Check' | 'Other';
  transactionRef?: string;
  collectedBy: string;
  collectedAt: Date;
}

const receiptSchema = new Schema<IReceipt>({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: false,
    index: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: false,
    index: true
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  orderCustomer: {
    type: String,
    required: true
  },
  orderRoute: {
    type: String,
    required: true
  },
  orderVehicle: {
    type: String,
    required: false
  },
  orderExecutive: {
    type: String,
    required: false
  },
  orderTotal: {
    type: Number,
    required: false
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentType: {
    type: String,
    enum: ['Cash', 'UPI / PhonePe / GPay', 'Check', 'Other'],
    required: true
  },
  transactionRef: {
    type: String,
    trim: true
  },
  collectedBy: {
    type: String,
    required: true
  },
  collectedAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
receiptSchema.index({ orderId: 1 });
receiptSchema.index({ orderVehicle: 1 });
receiptSchema.index({ orderExecutive: 1 });
receiptSchema.index({ collectedAt: -1 });

export default mongoose.model<IReceipt>('Receipt', receiptSchema);
