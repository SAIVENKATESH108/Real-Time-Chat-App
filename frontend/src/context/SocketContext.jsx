import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket.js';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const socketClient = connectSocket();
      setSocket(socketClient);

      function handleConnect() {
        setIsConnected(true);
        setConnectionError(null);
      }

      function handleDisconnect() {
        setIsConnected(false);
      }

      function handleConnectError(err) {
        setIsConnected(false);
        setConnectionError(err.message || 'Socket connection failed');
      }

      socketClient.on('connect', handleConnect);
      socketClient.on('disconnect', handleDisconnect);
      socketClient.on('connect_error', handleConnectError);

      return () => {
        socketClient.off('connect', handleConnect);
        socketClient.off('disconnect', handleDisconnect);
        socketClient.off('connect_error', handleConnectError);
      };
    } else {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
