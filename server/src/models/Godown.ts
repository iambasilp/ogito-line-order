import mongoose, { Document, Schema } from 'mongoose';

export interface IGodown extends Document {
  name: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const godownSchema = new Schema<IGodown>({
  name: { type: String, required: true, unique: true },
  location: { type: String }
}, {
  timestamps: true
});

export default mongoose.model<IGodown>('Godown', godownSchema);
