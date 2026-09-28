import { Schema, model, Document, Types } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  category: string;
  ownerId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Organization address is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Organization phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Organization email is required'],
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Organization category is required'],
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

OrganizationSchema.index({ name: 'text', category: 'text' });

export const Organization = model<IOrganization>('Organization', OrganizationSchema);
