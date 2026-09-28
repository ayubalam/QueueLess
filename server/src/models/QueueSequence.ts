import { Schema, model, Document, Types } from 'mongoose';

export interface IQueueSequence extends Document {
  serviceId: Types.ObjectId;
  queueDate: string; // YYYY-MM-DD
  currentNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const QueueSequenceSchema = new Schema<IQueueSequence>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service ID is required'],
      index: true,
    },
    queueDate: {
      type: String,
      required: [true, 'Queue date is required'],
      index: true,
    },
    currentNumber: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

QueueSequenceSchema.index({ serviceId: 1, queueDate: 1 }, { unique: true });

export const QueueSequence = model<IQueueSequence>('QueueSequence', QueueSequenceSchema);
