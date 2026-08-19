import mongoose, { Document, Schema } from 'mongoose';

export interface IProductInfo extends Document {
  name: string;
  description: string;
  image?: string;
}

const productInfoSchema = new Schema<IProductInfo>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String
  }
}, {
  timestamps: true
});

export default mongoose.model<IProductInfo>('ProductInfo', productInfoSchema);
