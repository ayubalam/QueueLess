/**
 * Socket.IO server setup.
 * Attaches to the existing HTTP server — does NOT create a second server.
 * Handles authentication, authorised room joining, and connection lifecycle.
 */
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { socketAuthMiddleware } from './socketAuth';
import { SOCKET_EVENTS, serviceRoom } from './socketEvents';
import { QueueToken } from '../models/QueueToken';
import { Counter } from '../models/Counter';
import { ACTIVE_QUEUE_STATUSES } from '../services/queueEngine';

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: clientUrl,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Ping/pong to detect stale connections
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Apply JWT auth to every connection
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const { userId, role } = socket.data as { userId: string; role: string };
    console.log(`[Socket] Connected: userId=${userId} role=${role} socketId=${socket.id}`);

    // ── Authorised room join ────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.JOIN_SERVICE_ROOM, async (serviceId: string) => {
      try {
        if (!serviceId || typeof serviceId !== 'string') {
          socket.emit('error', { message: 'Invalid serviceId' });
          return;
        }

        let authorized = false;

        if (role === 'staff') {
          // Staff: authorise from their assigned counter in the DB — never trust client claim
          const counter = await Counter.findOne({ _id: { $exists: true } })
            .where('organizationId').exists(true)
            .where('serviceId', serviceId)
            .lean();

          // More precise: find counter by userId via User model
          const { User } = await import('../models/User');
          const user = await User.findById(userId).select('counterId').lean();
          if (user?.counterId) {
            const staffCounter = await Counter.findById(user.counterId).lean();
            authorized = staffCounter?.serviceId?.toString() === serviceId;
          }
        } else if (role === 'customer') {
          // Customer: authorise only if they have an active token for this service
          const activeToken = await QueueToken.findOne({
            customerId: userId,
            serviceId,
            status: { $in: ACTIVE_QUEUE_STATUSES },
          }).lean();
          authorized = !!activeToken;
        } else if (role === 'organization_admin' || role === 'super_admin') {
          // Admins may observe any service room
          authorized = true;
        }

        if (!authorized) {
          socket.emit('error', { message: 'Not authorised to join this service room' });
          console.warn(`[Socket] Unauthorized room join attempt: userId=${userId} serviceId=${serviceId}`);
          return;
        }

        const room = serviceRoom(serviceId);
        await socket.join(room);
        console.log(`[Socket] userId=${userId} joined room ${room}`);
        socket.emit('room:joined', { room });
      } catch (err) {
        console.error('[Socket] JOIN_SERVICE_ROOM error:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ── Leave room ──────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.LEAVE_SERVICE_ROOM, async (serviceId: string) => {
      const room = serviceRoom(serviceId);
      await socket.leave(room);
      console.log(`[Socket] userId=${userId} left room ${room}`);
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: userId=${userId} socketId=${socket.id} reason=${reason}`);
    });
  });

  console.log('[Socket] Socket.IO server initialised');
  return io;
};

/**
 * Get the shared Socket.IO server instance.
 * Used by controllers to broadcast events after DB mutations.
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO server not initialised. Call initSocketServer first.');
  }
  return io;
};

/**
 * Broadcast a queue update to all clients in the service room.
 * Safe to call from any controller — will no-op if io is not yet ready.
 */
export const broadcastQueueUpdate = (
  payload: import('./socketEvents').QueueUpdatePayload
): void => {
  try {
    if (!io) return;
    const room = serviceRoom(payload.serviceId);
    io.to(room).emit(SOCKET_EVENTS.QUEUE_UPDATED, payload);
    console.log(`[Socket] Broadcast ${payload.eventType} → room ${room}`);
  } catch (err) {
    // Broadcasting failure must never crash queue operations
    console.error('[Socket] broadcastQueueUpdate error:', err);
  }
};

/**
 * Cleanly close the Socket.IO server and disconnect all sockets.
 * Essential for test teardown to prevent hanging sockets.
 */
export const closeSocketServer = async (): Promise<void> => {
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => resolve());
    });
    io = null;
  }
};
