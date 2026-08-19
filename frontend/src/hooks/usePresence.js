import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export function usePresence(roomId) {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    setOnlineUsers([]);

    if (!socket || !isConnected || !roomId) return;

    const handlePresenceUpdate = (data) => {
      if (data.roomId === roomId && Array.isArray(data.onlineUsers)) {
        setOnlineUsers(data.onlineUsers);
      }
    };

    socket.on('presence_update', handlePresenceUpdate);

    return () => {
      socket.off('presence_update', handlePresenceUpdate);
    };
  }, [socket, isConnected, roomId]);

  return {
    onlineUsers,
    totalOnline: onlineUsers.length,
  };
}
