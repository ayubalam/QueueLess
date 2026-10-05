import dotenv from 'dotenv';
import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { initSocketServer } from './socket/socketServer';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Create a standard Node HTTP server from Express app
  const httpServer = http.createServer(app);

  // Attach Socket.IO to the same HTTP server (Phase 5)
  initSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[QueueLess Server] Running on port ${PORT}`);
  });
};

startServer();
