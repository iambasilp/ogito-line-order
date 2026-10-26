import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketStudy extends Document {
  productName: string;
  customerName: string; // Customer / Shop Name
  customerType?: string;
  collectedBy: string; // Data Collected By
  brandName: string; // Product Brand Name
  weight?: string; // Product Weight
  packagingType?: string; // Packaging Type
  landingPrice: number;
  sellingPrice: number;
  mrp: number;
  marketLocation?: string; // Market Location
  notes?: string;
  collectionDate: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const marketStudySchema = new Schema<IMarketStudy>(
  {
    productName: {
      type: String,
      required: true,
      trim: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerType: {
      type: String,
      trim: true,
      default: 'Retailer'
    },
    collectedBy: {
      type: String,
      required: true,
      trim: true
    },
    brandName: {
      type: String,
      required: true,
      trim: true
    },
    weight: {
      type: String,
      trim: true,
      default: ''
    },
    packagingType: {
      type: String,
      trim: true,
      default: ''
    },
    landingPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    marketLocation: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    collectionDate: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high performance querying & analytics
marketStudySchema.index({ brandName: 1 });
marketStudySchema.index({ customerName: 1 });
marketStudySchema.index({ productName: 1 });
marketStudySchema.index({ marketLocation: 1 });
marketStudySchema.index({ collectedBy: 1 });
marketStudySchema.index({ collectionDate: -1 });

export default mongoose.model<IMarketStudy>('MarketStudy', marketStudySchema);
