import mongoose, { Document, Schema } from 'mongoose';

export interface IAiMessageSummary extends Document {
  date: string;
  versionHash: string; // Hash of message IDs and statuses to invalidate cache
  statistics: {
    totalMessages: number;
    approvedMessages: number;
    rejectedMessages: number;
  };
  ai: {
    overview: string;
    keyInsights: string[];
    notableApprovals: string[];
    notableRejections: string[];
    attentionItems: string[];
  };
  createdAt: Date;
}

const aiMessageSummarySchema = new Schema<IAiMessageSummary>({
  date: {
    type: String,
    required: true,
    index: true
  },
  versionHash: {
    type: String,
    required: true
  },
  statistics: {
    totalMessages: { type: Number, required: true },
    approvedMessages: { type: Number, required: true },
    rejectedMessages: { type: Number, required: true }
  },
  ai: {
    overview: { type: String, required: true },
    keyInsights: [{ type: String }],
    notableApprovals: [{ type: String }],
    notableRejections: [{ type: String }],
    attentionItems: [{ type: String }]
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800 // Automatically delete after 7 days (604800 seconds)
  }
});

export default mongoose.model<IAiMessageSummary>('AiMessageSummary', aiMessageSummarySchema);
