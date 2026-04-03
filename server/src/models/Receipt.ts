import mongoose, { Document, Schema } from 'mongoose';

export interface IReceipt extends Document {
  orderId: mongoose.Types.ObjectId;
  orderCustomer: string;
  orderRoute: string;
  orderTotal: number;
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
    required: true,
    index: true
  },
  orderCustomer: {
    type: String,
    required: true
  },
  orderRoute: {
    type: String,
    required: true
  },
  orderTotal: {
    type: Number,
    required: true
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
receiptSchema.index({ collectedAt: -1 });

export default mongoose.model<IReceipt>('Receipt', receiptSchema);
