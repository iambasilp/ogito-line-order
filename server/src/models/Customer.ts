import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  route: string;
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
    type: String,
    required: true,
    trim: true
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

// Create compound unique index on name and route
customerSchema.index({ name: 1, route: 1 }, { unique: true });

export default mongoose.model<ICustomer>('Customer', customerSchema);
