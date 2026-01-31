import mongoose, { Document, Schema } from 'mongoose';

export interface IRoute extends Document {
  name: string;
  isActive: boolean;
}

const routeSchema = new Schema<IRoute>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IRoute>('Route', routeSchema);
