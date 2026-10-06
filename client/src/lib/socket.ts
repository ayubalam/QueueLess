/**
 * Shared Socket.IO client singleton.
 *
 * The access token is stored in memory (never in localStorage/URL).
 * getAccessToken() is imported from the existing api.ts module.
 *
 * Usage:
 *   import { getSocket, connectSocket, disconnectSocket } from './socket';
 */
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SERVER_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/health', '')
  : 'http://localhost:5000';

// Singleton reference — one connection for the entire app lifetime
let socket: Socket | null = null;

/**
 * Connect the socket using the current in-memory access token.
 * Safe to call multiple times — returns the existing socket if already connected.
 */
export const connectSocket = (): Socket => {
  if (socket && socket.connected) return socket;

  const token = getAccessToken();
  const authPayload = token ? { token } : { isPublic: true };

  if (!socket) {
    socket = io(SERVER_URL, {
      auth: authPayload,
      // Don't auto-connect — we control timing via connectSocket()
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  } else {
    // Update auth token before reconnecting (e.g. after token refresh or login/logout)
    socket.auth = authPayload;
  }

  socket.connect();
  return socket;
};

/**
 * Disconnect and destroy the socket instance.
 * Called on logout.
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get the current socket instance (may be null if not connected).
 */
export const getSocket = (): Socket | null => socket;
