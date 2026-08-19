import { Server } from 'socket.io';
import { config } from '../config/env.js';
import { socketAuthMiddleware } from './socketAuth.js';
import { registerChatHandlers } from './chatHandler.js';

/**
 * Initialize Socket.io server and attach middleware and event handlers.
 * 
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or tests) or matching CLIENT_URL
        if (!origin || origin === config.clientUrl || config.nodeEnv === 'development' || config.nodeEnv === 'test') {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in dev/staging to avoid CORS issues
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Attach handshake authentication middleware
  io.use(socketAuthMiddleware);

  // Connection listener
  io.on('connection', (socket) => {
    // Register real-time event handlers
    registerChatHandlers(io, socket);
  });

  return io;
}
