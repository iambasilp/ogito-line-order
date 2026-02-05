import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderMessage {
  _id?: mongoose.Types.ObjectId;
  text: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
  createdByUsername: string;
}

export interface IOrder extends Document {
  date: Date;
  customerId: mongoose.Types.ObjectId;
  salesExecutive: string;
  route: mongoose.Types.ObjectId;
  vehicle: string;
  standardQty: number;
  premiumQty: number;
  createdBy: mongoose.Types.ObjectId;
  createdByUsername: string;
  orderMessages?: IOrderMessage[];
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
    type: Schema.Types.ObjectId,
    ref: 'Route',
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
  },
  orderMessages: [{
    text: {
      type: String,
      required: true,
      maxlength: 1000
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true
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
  }]
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
