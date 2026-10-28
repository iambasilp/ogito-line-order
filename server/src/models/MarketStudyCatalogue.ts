import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketStudyCatalogue extends Document {
  name: string;
  isActive: boolean;
  displayOrder: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const marketStudyCatalogueSchema = new Schema<IMarketStudyCatalogue>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

marketStudyCatalogueSchema.index({ name: 1 });
marketStudyCatalogueSchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model<IMarketStudyCatalogue>(
  'MarketStudyCatalogue',
  marketStudyCatalogueSchema
);
