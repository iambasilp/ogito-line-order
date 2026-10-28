import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketStudyObservation {
  _id: mongoose.Types.ObjectId;
  catalogueProductId?: mongoose.Types.ObjectId;
  catalogueProductName: string; // Snapshot of catalogue product name
  brandName: string;
  variant?: string; // Flavour / label / variant
  weight?: string; // Weight / volume (e.g. 1 Litre, 500 ml, 250 g)
  packagingType?: string; // Tub, Cone, Cup, Stick / Bar, etc.
  landingPrice: number;
  sellingPrice: number;
  mrp: number;
  promotionNotes?: string;
  notes?: string;
  createdAt: Date;
}

export interface IMarketStudySurvey extends Document {
  customerId?: mongoose.Types.ObjectId;
  customerName: string; // Snapshot of shop / customer name
  customerType?: string;
  marketLocation?: string;
  routeId?: mongoose.Types.ObjectId;
  surveyDate: Date;
  surveyorId?: mongoose.Types.ObjectId;
  collectedBy: string; // Name of surveyor / collector
  notes?: string; // General visit notes
  status: 'draft' | 'completed';
  observations: IMarketStudyObservation[];
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const observationSchema = new Schema<IMarketStudyObservation>(
  {
    catalogueProductId: {
      type: Schema.Types.ObjectId,
      ref: 'MarketStudyCatalogue'
    },
    catalogueProductName: {
      type: String,
      required: true,
      trim: true
    },
    brandName: {
      type: String,
      required: true,
      trim: true
    },
    variant: {
      type: String,
      trim: true,
      default: ''
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
    promotionNotes: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const marketStudySurveySchema = new Schema<IMarketStudySurvey>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer'
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
    marketLocation: {
      type: String,
      trim: true,
      default: ''
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route'
    },
    surveyDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    surveyorId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    collectedBy: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['draft', 'completed'],
      default: 'completed',
      index: true
    },
    observations: {
      type: [observationSchema],
      default: []
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

// Indexes for high performance querying & analytics
marketStudySurveySchema.index({ customerName: 1 });
marketStudySurveySchema.index({ marketLocation: 1 });
marketStudySurveySchema.index({ surveyDate: -1, createdAt: -1 });
marketStudySurveySchema.index({ 'observations.catalogueProductName': 1 });
marketStudySurveySchema.index({ 'observations.brandName': 1 });
marketStudySurveySchema.index({ 'observations.variant': 1 });

export default mongoose.model<IMarketStudySurvey>(
  'MarketStudySurvey',
  marketStudySurveySchema
);
