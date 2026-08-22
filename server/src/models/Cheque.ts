import mongoose, { Document, Schema } from 'mongoose';

export interface ICheque extends Document {
  customerName: string;
  chequeNumber: string;
  chequeDate: string;
  amount: number;
  bankName: string;
  receivedDate: string;
  status: 'Pending' | 'Cleared' | 'Bounced';
  bounceReason?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chequeSchema = new Schema(
  {
    customerName: { type: String, required: true },
    chequeNumber: { type: String, required: true },
    chequeDate: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    bankName: { type: String, required: true },
    receivedDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Cleared', 'Bounced'],
      default: 'Pending',
    },
    bounceReason: { type: String },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Indexes for faster search
chequeSchema.index({ customerName: 'text', chequeNumber: 'text', bankName: 'text' });
chequeSchema.index({ status: 1 });

export const Cheque = mongoose.model<ICheque>('Cheque', chequeSchema);
