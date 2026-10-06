/**
 * Socket.IO authentication middleware.
 * Validates the JWT access token sent as a socket handshake auth token.
 * Attaches { userId, role } to socket.data — never trusts client-supplied IDs.
 */
import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/token';
import { User } from '../models/User';

export interface SocketUserData {
  userId: string;
  role: string;
}

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    const isPublic = socket.handshake.auth?.isPublic === true;
    const token = socket.handshake.auth?.token as string | undefined;

    if (isPublic) {
      socket.data.userId = 'anonymous';
      socket.data.role = 'public';
      return next();
    }

    if (!token) {
      return next(new Error('Authentication required: no token provided'));
    }

    let payload: { userId: string; role: string };
    try {
      payload = verifyAccessToken(token);
    } catch {
      return next(new Error('Authentication failed: invalid or expired token'));
    }

    const user = await User.findById(payload.userId).select('_id role isActive');
    if (!user) {
      return next(new Error('Authentication failed: user not found'));
    }
    if (!user.isActive) {
      return next(new Error('Authentication failed: account is deactivated'));
    }

    // Store verified server-side data — never trust handshake.auth for authorization
    socket.data.userId = user._id.toString();
    socket.data.role = user.role;

    next();
  } catch {
    next(new Error('Socket authentication error'));
  }
};
