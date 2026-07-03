import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  route: mongoose.Types.ObjectId;
  salesExecutive: string;
  greenPrice: number;
  orangePrice: number;
  phone: string;
  customerSince?: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const customerSchema = new Schema<ICustomer>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  route: {
    type: Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  salesExecutive: {
    type: String,
    required: true,
    trim: true
  },
  greenPrice: {
    type: Number,
    required: true,
    min: 0
  },
  orangePrice: {
    type: Number,
    required: true,
    min: 0
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  customerSince: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create unique index on name with case-insensitive collation
customerSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Performance index for rapid searching by salesExecutive
customerSchema.index({ salesExecutive: 1, name: 1 });

// Performance index for order filtering by salesExecutive
customerSchema.index({ salesExecutive: 1 });

// Performance index for customerSince time-series queries
customerSchema.index({ customerSince: -1 });
customerSchema.index({ salesExecutive: 1, customerSince: -1 });

export default mongoose.model<ICustomer>('Customer', customerSchema);
