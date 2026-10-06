import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import organizationRoutes from './routes/organizationRoutes';
import serviceRoutes from './routes/serviceRoutes';
import counterRoutes from './routes/counterRoutes';
import staffRoutes from './routes/staffRoutes';
import queueRoutes from './routes/queueRoutes';
import staffQueueRoutes from './routes/staffQueueRoutes';
import publicRoutes from './routes/publicRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'QueueLess API Server operational',
    data: {
      system: 'QueueLess API',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/staff/queue', staffQueueRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

export default app;
