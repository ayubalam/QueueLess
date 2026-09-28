import { Schema, model, Document, Types } from 'mongoose';

export interface IService extends Document {
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  estimatedServiceTime: number; // in minutes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    estimatedServiceTime: {
      type: Number,
      required: [true, 'Estimated service time is required'],
      min: [1, 'Estimated service time must be at least 1 minute'],
      default: 15,
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

ServiceSchema.index({ organizationId: 1, isActive: 1 });

export const Service = model<IService>('Service', ServiceSchema);
