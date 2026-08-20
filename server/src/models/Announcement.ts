import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  message: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const announcementSchema = new Schema<IAnnouncement>({
  message: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);
