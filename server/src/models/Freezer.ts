import mongoose, { Document, Schema } from 'mongoose';

export interface IFreezer extends Document {
  freezerId: string; // Auto-generated e.g. FRZ-0001
  model: string;
  capacity: number; // in Litres
  serialNumber: string;
  purchaseDate: Date;
  cost: number;
  condition: 'New' | 'Good' | 'Fair' | 'Needs Repair';
  status: 'In Stock' | 'Installed' | 'In Repair' | 'Scrapped';
  
  // Link to existing collections
  customerId?: mongoose.Types.ObjectId; 
  route?: mongoose.Types.ObjectId;
  salesExecutive?: string; // username of the salesman
  
  installedDate?: Date;
  lastServiceDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const freezerSchema = new Schema<IFreezer>(
  {
    freezerId: { type: String, required: true, unique: true },
    model: { type: String, required: true },
    capacity: { type: Number, required: true },
    serialNumber: { type: String, required: true },
    purchaseDate: { type: Date, required: true },
    cost: { type: Number, required: true },
    condition: { 
      type: String, 
      enum: ['New', 'Good', 'Fair', 'Needs Repair'], 
      default: 'New',
      required: true 
    },
    status: { 
      type: String, 
      enum: ['In Stock', 'Installed', 'In Repair', 'Scrapped'], 
      default: 'In Stock',
      required: true 
    },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    route: { type: Schema.Types.ObjectId, ref: 'Route' },
    salesExecutive: { type: String }, // Links to User username
    installedDate: { type: Date },
    lastServiceDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IFreezer>('Freezer', freezerSchema);
