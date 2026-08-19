import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { api } from '../services/api.js';
import { soundEffects } from '../utils/soundEffects.js';
import { notifications } from '../utils/notifications.js';

export function useChat(roomId) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { soundEnabled } = useTheme();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Initial load of messages for the room
  const fetchInitialMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.messages.get(roomId, null, 50);
      if (data.success) {
        setMessages(data.messages || []);
        setHasMore(Boolean(data.hasMore));
        setNextCursor(data.nextCursor || null);
      }
    } catch (err) {
      console.error('Failed to load room messages:', err);
      setError('Could not load chat history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Load older messages (cursor-based pagination)
  const loadOlderMessages = useCallback(async () => {
    if (!roomId || !hasMore || loadingMore || !nextCursor) return;
    try {
      setLoadingMore(true);
      const data = await api.messages.get(roomId, nextCursor, 50);
      if (data.success) {
        const olderMessages = data.messages || [];
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueOlder = olderMessages.filter((m) => !existingIds.has(m.id));
          return [...uniqueOlder, ...prev];
        });
        setHasMore(Boolean(data.hasMore));
        setNextCursor(data.nextCursor || null);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [roomId, hasMore, loadingMore, nextCursor]);

  // Socket listeners for real-time messaging, reactions, and deletions
  useEffect(() => {
    if (!roomId) return;

    fetchInitialMessages();

    if (!socket || !isConnected) return;

    const lastMsgId = messagesRef.current[messagesRef.current.length - 1]?.id || null;
    socket.emit('join_room', { roomId, lastMessageId: lastMsgId }, (res) => {
      if (res && !res.success) {
        console.warn('Socket join_room warning:', res.error);
      }
    });

    const handleNewMessage = (newMsg) => {
      if (newMsg.roomId !== roomId) return;

      if (newMsg.userId !== user?.id) {
        if (soundEnabled && user?.presenceStatus !== 'dnd') {
          soundEffects.playReceivedSound();
        }

        // Show Native OS Push Notification if document in background
        notifications.show({
          title: `${newMsg.user?.displayName || 'Someone'} in #${roomId}`,
          body: newMsg.content || (newMsg.attachmentType === 'audio' ? '🎤 Sent a voice note' : 'Sent an attachment'),
        });
      }

      setMessages((prev) => {
        if (newMsg.tempId) {
          const index = prev.findIndex((m) => m.tempId === newMsg.tempId || m.id === newMsg.id);
          if (index !== -1) {
            const copy = [...prev];
            copy[index] = newMsg;
            return copy;
          }
        }

        if (prev.some((m) => m.id === newMsg.id)) {
          return prev;
        }

        return [...prev, newMsg];
      });
    };

    const handleReactionUpdated = (data) => {
      if (data.roomId !== roomId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    };

    const handleMessageDeleted = (data) => {
      if (data.roomId !== roomId) return;
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    };

    const handleSyncMessages = (data) => {
      if (data.roomId !== roomId || !Array.isArray(data.messages)) return;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMissed = data.messages.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newMissed];
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('sync_messages', handleSyncMessages);

    return () => {
      socket.emit('leave_room', { roomId });
      socket.off('new_message', handleNewMessage);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('sync_messages', handleSyncMessages);
    };
  }, [roomId, socket, isConnected, fetchInitialMessages, user?.id, soundEnabled, user?.presenceStatus]);

  // Send message (text, replies, GIFs, voice notes, attachments)
  const sendMessage = useCallback(
    async ({ content, gifUrl, attachmentUrl, attachmentType, audioDuration, replyToId }) => {
      if (!roomId || (!content?.trim() && !gifUrl && !attachmentUrl)) return;

      const trimmedContent = (content || '').trim();
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const optimisticMsg = {
        id: tempId,
        tempId,
        roomId,
        userId: user?.id,
        content: trimmedContent || (gifUrl ? 'GIF' : (attachmentType === 'audio' ? 'Voice Message' : 'Attachment')),
        gifUrl: gifUrl || null,
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        audioDuration: audioDuration || null,
        replyToId: replyToId || null,
        reactions: {},
        createdAt: new Date().toISOString(),
        user: {
          id: user?.id,
          displayName: user?.displayName || 'Me',
          email: user?.email,
          avatarUrl: user?.avatarUrl,
          avatarImage: user?.avatarImage,
          presenceStatus: user?.presenceStatus,
        },
        isOptimistic: true,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const payload = {
        roomId,
        content: trimmedContent,
        gifUrl,
        attachmentUrl,
        attachmentType,
        audioDuration,
        replyToId,
        tempId,
      };

      if (socket && isConnected) {
        return new Promise((resolve, reject) => {
          socket.emit('send_message', payload, (response) => {
            if (response?.success) {
              setMessages((prev) =>
                prev.map((m) => (m.tempId === tempId ? response.message : m))
              );
              resolve(response.message);
            } else {
              api.messages
                .sendFallback(roomId, trimmedContent)
                .then((fallbackData) => {
                  setMessages((prev) =>
                    prev.map((m) => (m.tempId === tempId ? fallbackData.message : m))
                  );
                  resolve(fallbackData.message);
                })
                .catch((err) => {
                  setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
                  reject(err);
                });
            }
          });
        });
      } else {
        try {
          const fallbackData = await api.messages.sendFallback(roomId, trimmedContent);
          setMessages((prev) =>
            prev.map((m) => (m.tempId === tempId ? fallbackData.message : m))
          );
          return fallbackData.message;
        } catch (err) {
          setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
          throw err;
        }
      }
    },
    [roomId, socket, isConnected, user]
  );

  // Send reaction
  const sendReaction = useCallback(
    (messageId, emoji) => {
      if (!roomId || !messageId || !emoji || !socket || !isConnected) return;
      socket.emit('message_reaction', { roomId, messageId, emoji });
    },
    [roomId, socket, isConnected]
  );

  // Delete message
  const deleteMessage = useCallback(
    (messageId) => {
      if (!roomId || !messageId || !socket || !isConnected) return;
      socket.emit('delete_message', { roomId, messageId });
    },
    [roomId, socket, isConnected]
  );

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    sendMessage,
    sendReaction,
    deleteMessage,
    loadOlderMessages,
    reloadMessages: fetchInitialMessages,
  };
}
