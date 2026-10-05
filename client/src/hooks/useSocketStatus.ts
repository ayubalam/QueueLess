/**
 * useSocketStatus — tracks Socket.IO connection state for UI indicators.
 * Returns { connected, reconnecting }
 */
import { useState, useEffect } from 'react';
import { getSocket, connectSocket } from '../lib/socket';

export const useSocketStatus = () => {
  const socket = connectSocket();
  const [connected, setConnected] = useState(socket.connected);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onConnect = () => { setConnected(true); setReconnecting(false); };
    const onDisconnect = () => setConnected(false);
    const onReconnectAttempt = () => setReconnecting(true);
    const onReconnect = () => { setConnected(true); setReconnecting(false); };
    const onReconnectFailed = () => setReconnecting(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.io.on('reconnect_attempt', onReconnectAttempt);
    s.io.on('reconnect', onReconnect);
    s.io.on('reconnect_failed', onReconnectFailed);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.io.off('reconnect_attempt', onReconnectAttempt);
      s.io.off('reconnect', onReconnect);
      s.io.off('reconnect_failed', onReconnectFailed);
    };
  }, []);

  return { connected, reconnecting };
};
