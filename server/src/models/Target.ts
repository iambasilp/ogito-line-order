import mongoose, { Document, Schema } from 'mongoose';

export interface ITarget extends Document {
  username: string;
  month: string; // Format: YYYY-MM
  target: number;
}

const targetSchema = new Schema<ITarget>({
  username: {
    type: String,
    required: true,
    index: true,
    trim: true,
    lowercase: true
  },
  month: {
    type: String,
    required: true,
    index: true,
    match: /^\d{4}-\d{2}$/ // Ensure YYYY-MM format
  },
  target: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Create a compound unique index so a user can only have one target per month
targetSchema.index({ username: 1, month: 1 }, { unique: true });

export default mongoose.model<ITarget>('Target', targetSchema);
