import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '../utils/api';

const getSocketUrl = (): string => {
  const backendUrl = getBackendUrl();
  if (backendUrl) return backendUrl;
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
};

// Global socket instance singleton
let globalSocket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!globalSocket) {
    const socketUrl = getSocketUrl();
    console.log(`[Socket.io] Initializing connection to: ${socketUrl}`);
    
    globalSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    globalSocket.on('connect', () => {
      console.log(`[Socket.io] Connected`);
    });

    globalSocket.on('connect_error', (err) => {
      console.warn(`[Socket.io] Connection Error:`, err.message);
    });

    globalSocket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Disconnected:`, reason);
    });
  }
  return globalSocket;
};

export const useHospitalSocket = () => {
  const [socket, setSocket] = useState<Socket>(getSocket);
  const [connected, setConnected] = useState<boolean>(() => getSocket().connected);

  useEffect(() => {
    const sock = getSocket();
    setSocket(sock);
    setConnected(sock.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket, connected };
};
