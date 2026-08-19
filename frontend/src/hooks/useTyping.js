import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function useTyping(roomId) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  const [typingUsers, setTypingUsers] = useState(new Map());
  const isTypingRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // Stop typing handler (emits typing_stop to room)
  const stopTyping = useCallback(() => {
    if (isTypingRef.current && socket && isConnected && roomId) {
      socket.emit('typing_stop', { roomId });
      isTypingRef.current = false;
    }
  }, [socket, isConnected, roomId]);

  // Keystroke handler called on message input change
  const handleTypingKeystroke = useCallback(() => {
    if (!socket || !isConnected || !roomId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', { roomId });
    }

    // Reset debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [socket, isConnected, roomId, stopTyping]);

  // Clean up debounce on unmount / room change
  useEffect(() => {
    setTypingUsers(new Map());
    isTypingRef.current = false;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!socket || !isConnected || !roomId) return;

    const handleUserTyping = (data) => {
      if (data.roomId !== roomId || data.userId === user?.id) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data.displayName);
        return next;
      });
    };

    const handleUserStopTyping = (data) => {
      if (data.roomId !== roomId) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      stopTyping();
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [socket, isConnected, roomId, user?.id, stopTyping]);

  // Generate formatted typing text
  const names = Array.from(typingUsers.values());
  let typingText = '';

  if (names.length === 1) {
    typingText = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    typingText = `${names[0]} and ${names[1]} are typing...`;
  } else if (names.length > 2) {
    typingText = `${names[0]}, ${names[1]}, and ${names.length - 2} more are typing...`;
  }

  return {
    isAnyoneTyping: names.length > 0,
    typingText,
    handleTypingKeystroke,
    stopTyping,
  };
}
