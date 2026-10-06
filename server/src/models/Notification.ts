import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'TOKEN_CALLED'
  | 'TOKEN_SERVING'
  | 'TOKEN_COMPLETED'
  | 'TOKEN_SKIPPED'
  | 'TOKEN_CANCELLED'
  | 'TURN_APPROACHING'
  | 'QUEUE_UPDATE';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'TOKEN_CALLED',
  'TOKEN_SERVING',
  'TOKEN_COMPLETED',
  'TOKEN_SKIPPED',
  'TOKEN_CANCELLED',
  'TURN_APPROACHING',
  'QUEUE_UPDATE',
];

export interface INotification extends Document {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  serviceId: Types.ObjectId;
  tokenId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
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
    tokenId: {
      type: Schema.Types.ObjectId,
      ref: 'QueueToken',
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user query efficiency and idempotency checks
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, tokenId: 1, type: 1 });

export const Notification = model<INotification>('Notification', NotificationSchema);
