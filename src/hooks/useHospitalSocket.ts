import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { getBackendUrl } from '../utils/api';

const SOCKET_URL = getBackendUrl() || (typeof window !== 'undefined' ? window.location.origin : '');

// Global socket instance so we don't open multiple connections on navigation
let globalSocket: Socket | null = null;

export const useHospitalSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(globalSocket);
  const [connected, setConnected] = useState(globalSocket ? globalSocket.connected : false);

  useEffect(() => {
    if (!globalSocket) {
      globalSocket = io(SOCKET_URL);
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    globalSocket.on('connect', onConnect);
    globalSocket.on('disconnect', onDisconnect);

    setSocket(globalSocket);
    setConnected(globalSocket.connected);

    return () => {
      if (globalSocket) {
        globalSocket.off('connect', onConnect);
        globalSocket.off('disconnect', onDisconnect);
      }
    };
  }, []);

  return { socket, connected };
};
