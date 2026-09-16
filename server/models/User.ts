import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  phone?: string;
  phoneNumber?: string;
  name?: string;
  state?: string;
  district?: string;
  preferredLanguage?: string;
  isVerified: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  phoneVerified: boolean;
  phoneVerifiedAt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },
    preferredLanguage: {
      type: String,
      trim: true,
      default: 'en',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    phoneVerifiedAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'users',
    strict: false,
  }
);

// Keep phone and phoneNumber synchronized
UserSchema.pre('save', function () {
  if (this.phone && !this.phoneNumber) {
    this.phoneNumber = this.phone;
  } else if (this.phoneNumber && !this.phone) {
    this.phone = this.phoneNumber;
  }
});

// Prevent re-compilation in development reloads
export const User: mongoose.Model<IUser> =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema, 'users');
