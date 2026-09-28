import { Schema, model, Document, Types } from 'mongoose';

export interface ICounter extends Document {
  organizationId: Types.ObjectId;
  serviceId?: Types.ObjectId;
  name: string;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CounterSchema = new Schema<ICounter>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Counter name is required'],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
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

CounterSchema.index({ organizationId: 1, serviceId: 1, isActive: 1 });

export const Counter = model<ICounter>('Counter', CounterSchema);
