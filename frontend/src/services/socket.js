import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let socketInstance = null;

/**
 * Initializes or returns the Socket.io client instance with cookie credentials.
 */
export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socketInstance;
}

/**
 * Connect the socket instance.
 */
export function connectSocket() {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/**
 * Disconnect and destroy current socket instance.
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
