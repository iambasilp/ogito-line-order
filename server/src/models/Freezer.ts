import mongoose, { Document, Schema } from 'mongoose';

export interface IFreezer extends Document {
  freezerId: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  capacityLitres?: number;
  
  // Purchase Information
  purchaseDate?: Date;
  purchaseCost?: number;
  supplier?: string;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;

  // Current Assignment
  customerName?: string;
  area?: string;
  location?: string;
  salesman?: string;
  installedDate?: Date;

  // Current Status
  condition: 'New' | 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
  status: 'In Stock' | 'Active' | 'Under Repair' | 'Inactive' | 'Transferred' | 'Returned' | 'Retired';

  // Service Information
  lastServiceDate?: Date;
  nextServiceDueDate?: Date;

  // Sales Information
  averageMonthlySales?: number;

  // Additional
  remarks?: string;
}

const freezerSchema = new Schema<IFreezer>({
  freezerId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  serialNumber: {
    type: String,
    trim: true,
  },
  manufacturer: {
    type: String,
    trim: true,
  },
  model: {
    type: String,
    trim: true,
  },
  capacityLitres: {
    type: Number,
    min: 0,
  },
  purchaseDate: {
    type: Date,
  },
  purchaseCost: {
    type: Number,
    min: 0,
  },
  supplier: {
    type: String,
    trim: true,
  },
  warrantyStartDate: {
    type: Date,
  },
  warrantyEndDate: {
    type: Date,
  },
  customerName: {
    type: String,
    trim: true,
  },
  area: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  salesman: {
    type: String,
    trim: true,
  },
  installedDate: {
    type: Date,
  },
  condition: {
    type: String,
    enum: ['New', 'Excellent', 'Good', 'Fair', 'Poor', 'Damaged'],
    default: 'New',
  },
  status: {
    type: String,
    enum: ['In Stock', 'Active', 'Under Repair', 'Inactive', 'Transferred', 'Returned', 'Retired'],
    default: 'In Stock',
  },
  lastServiceDate: {
    type: Date,
  },
  nextServiceDueDate: {
    type: Date,
  },
  averageMonthlySales: {
    type: Number,
    min: 0,
    default: 0,
  },
  remarks: {
    type: String,
  }
}, {
  timestamps: true,
});

// Indexes for fast searching and filtering
freezerSchema.index({ freezerId: 1 }, { unique: true });
freezerSchema.index({ serialNumber: 1 });
freezerSchema.index({ customerName: 1 });
freezerSchema.index({ area: 1 });
freezerSchema.index({ salesman: 1 });
freezerSchema.index({ status: 1 });
freezerSchema.index({ condition: 1 });
freezerSchema.index({ model: 1 });

export default mongoose.model<IFreezer>('Freezer', freezerSchema);
