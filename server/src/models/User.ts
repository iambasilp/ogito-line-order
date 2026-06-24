import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants';

export interface IUser extends Document {
  username: string;
  name: string;
  pin: string;
  role: typeof ROLES.ADMIN | typeof ROLES.USER | typeof ROLES.DRIVER | typeof ROLES.CEO;
  pushSubscriptions?: Array<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    deviceType?: string;
    lastUsed: Date;
  }>;
  comparePin(candidatePin: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  pin: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: [ROLES.ADMIN, ROLES.USER, ROLES.DRIVER, ROLES.CEO],
    default: ROLES.USER,
    required: true
  },
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    },
    deviceType: String,
    lastUsed: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Hash PIN before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare PIN
userSchema.methods.comparePin = async function(candidatePin: string): Promise<boolean> {
  return bcrypt.compare(candidatePin, this.pin);
};

export default mongoose.model<IUser>('User', userSchema);
