import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  route: mongoose.Types.ObjectId;
  salesExecutive: string;
  greenPrice: number;
  orangePrice: number;
  phone: string;
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
  }
}, {
  timestamps: true
});

// Create unique index on name with case-insensitive collation
customerSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Performance index for order filtering by salesExecutive
customerSchema.index({ salesExecutive: 1 });

export default mongoose.model<ICustomer>('Customer', customerSchema);
