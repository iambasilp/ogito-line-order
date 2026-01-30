import mongoose, { Document, Schema } from 'mongoose';
import { ROLES } from '../config/constants';

export interface IUser extends Document {
  username: string;
  pin: string;
  role: typeof ROLES.ADMIN | typeof ROLES.USER;
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
    required: true,
    minlength: 6,
    maxlength: 6
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

export default mongoose.model<IUser>('User', userSchema);
