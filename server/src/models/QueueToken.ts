import { Schema, model, Document, Types } from 'mongoose';

export type QueueTokenStatus =
  | 'WAITING'
  | 'CALLED'
  | 'SERVING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED';

export interface IQueueToken extends Document {
  organizationId: Types.ObjectId;
  serviceId: Types.ObjectId;
  customerId: Types.ObjectId;
  counterId?: Types.ObjectId | null;
  tokenNumber: number;
  tokenCode: string;
  queueDate: string; // YYYY-MM-DD
  status: QueueTokenStatus;
  joinedAt: Date;
  calledAt?: Date;
  servingStartedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  estimatedWaitMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const QueueTokenSchema = new Schema<IQueueToken>(
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
      required: [true, 'Service ID is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    counterId: {
      type: Schema.Types.ObjectId,
      ref: 'Counter',
      default: null,
      index: true,
    },
    tokenNumber: {
      type: Number,
      required: [true, 'Token number is required'],
    },
    tokenCode: {
      type: String,
      required: [true, 'Token code is required'],
      trim: true,
      index: true,
    },
    queueDate: {
      type: String,
      required: [true, 'Queue date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'SKIPPED', 'CANCELLED'],
      default: 'WAITING',
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    calledAt: {
      type: Date,
    },
    servingStartedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    estimatedWaitMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal queries and uniqueness
QueueTokenSchema.index({ serviceId: 1, queueDate: 1, tokenNumber: 1 }, { unique: true });
QueueTokenSchema.index({ serviceId: 1, queueDate: 1, tokenCode: 1 }, { unique: true });
QueueTokenSchema.index({ customerId: 1, serviceId: 1, status: 1 });
QueueTokenSchema.index({ organizationId: 1, queueDate: 1, status: 1 });
QueueTokenSchema.index({ serviceId: 1, queueDate: 1, status: 1, tokenNumber: 1 });

export const QueueToken = model<IQueueToken>('QueueToken', QueueTokenSchema);
