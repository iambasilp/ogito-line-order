import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants';

export interface IUser extends Document {
  username: string;
  pin: string;
  role: typeof ROLES.ADMIN | typeof ROLES.USER;
  comparePin(candidatePin: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  pin: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: [ROLES.ADMIN, ROLES.USER],
    default: ROLES.USER,
    required: true
  }
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
