import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalMessage extends Document {
  text: string;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

const GlobalMessageSchema: Schema = new Schema({
  text: { 
    type: String, 
    required: true,
    maxlength: 1000,
    trim: true
  },
  senderId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  senderName: { 
    type: String, 
    required: true 
  },
  senderRole: { 
    type: String, 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for fetching latest messages quickly
GlobalMessageSchema.index({ createdAt: -1 });

export default mongoose.model<IGlobalMessage>('GlobalMessage', GlobalMessageSchema);
