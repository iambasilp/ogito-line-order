import mongoose, { Document, Schema } from 'mongoose';

export interface IGodownTransfer extends Document {
  date: Date;
  vehicleNumber: string;
  driverName?: string;
  source: string;
  destination: string;
  product: 'Standard' | 'Premium' | 'Alhaj';
  quantity: number;
  dispatchTime: Date;
  deliveryTime?: Date;
  status: 'Dispatched' | 'Delivered' | 'Cancelled';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const godownTransferSchema = new Schema<IGodownTransfer>({
  date: { type: Date, required: true },
  vehicleNumber: { type: String, required: true },
  driverName: { type: String },
  source: { type: String, required: true },
  destination: { type: String, required: true },
  product: { type: String, enum: ['Standard', 'Premium', 'Alhaj'], required: true },
  quantity: { type: Number, required: true },
  dispatchTime: { type: Date, required: true },
  deliveryTime: { type: Date },
  status: { type: String, enum: ['Dispatched', 'Delivered', 'Cancelled'], default: 'Dispatched' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export default mongoose.model<IGodownTransfer>('GodownTransfer', godownTransferSchema);
