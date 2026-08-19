import prisma from '../config/db.js';
import { sanitizeMessageContent, validateMessageContent } from '../utils/sanitize.js';
import { presenceManager } from './presenceManager.js';

/**
 * Register chat, calling, reaction, and presence event handlers for an authenticated socket.
 * 
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerChatHandlers(io, socket) {
  const user = socket.user;

  /**
   * Handle joining a chat room
   */
  socket.on('join_room', async (data, callback = () => {}) => {
    try {
      const { roomId, lastMessageId } = data || {};
      if (!roomId) {
        return callback({ success: false, error: 'roomId is required' });
      }

      const room = await prisma.room.findFirst({
        where: {
          OR: [{ id: roomId }, { name: roomId.toLowerCase() }],
        },
      });

      if (!room) {
        return callback({ success: false, error: 'Room not found' });
      }

      const actualRoomId = room.id;

      if (room.isPrivate) {
        const isMember = await prisma.roomMember.findUnique({
          where: {
            userId_roomId: {
              userId: user.id,
              roomId: actualRoomId,
            },
          },
        });

        if (!isMember) {
          return callback({ success: false, error: 'Access denied to private room' });
        }
      } else {
        await prisma.roomMember.upsert({
          where: {
            userId_roomId: {
              userId: user.id,
              roomId: actualRoomId,
            },
          },
          create: {
            userId: user.id,
            roomId: actualRoomId,
            role: 'member',
          },
          update: {},
        });
      }

      socket.join(actualRoomId);
      presenceManager.addUser(actualRoomId, user, socket.id);

      const onlineUsers = presenceManager.getRoomOnlineUsers(actualRoomId);
      io.to(actualRoomId).emit('presence_update', {
        roomId: actualRoomId,
        onlineUsers,
        totalOnline: onlineUsers.length,
      });

      socket.to(actualRoomId).emit('user_joined', {
        roomId: actualRoomId,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          avatarImage: user.avatarImage,
          presenceStatus: user.presenceStatus,
        },
      });

      if (lastMessageId) {
        try {
          const lastMsg = await prisma.message.findUnique({
            where: { id: String(lastMessageId) },
            select: { createdAt: true },
          });

          if (lastMsg) {
            const missedMessages = await prisma.message.findMany({
              where: {
                roomId: actualRoomId,
                isDeleted: false,
                createdAt: { gt: lastMsg.createdAt },
              },
              orderBy: { createdAt: 'asc' },
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    email: true,
                    avatarUrl: true,
                    avatarImage: true,
                    presenceStatus: true,
                    statusMessage: true,
                  },
                },
                replyTo: {
                  select: {
                    id: true,
                    content: true,
                    attachmentType: true,
                    user: { select: { displayName: true } },
                  },
                },
              },
            });

            if (missedMessages.length > 0) {
              socket.emit('sync_messages', {
                roomId: actualRoomId,
                messages: missedMessages,
              });
            }
          }
        } catch (syncErr) {
          console.warn('Reconnection sync error:', syncErr.message);
        }
      }

      callback({
        success: true,
        roomId: actualRoomId,
        roomName: room.name,
        onlineUsers,
      });
    } catch (error) {
      console.error('Socket join_room error:', error);
      callback({ success: false, error: error.message || 'Failed to join room' });
    }
  });

  /**
   * Handle leaving a chat room
   */
  socket.on('leave_room', (data, callback = () => {}) => {
    try {
      const { roomId } = data || {};
      if (!roomId) return callback({ success: false, error: 'roomId required' });

      socket.leave(roomId);
      const isNowOffline = presenceManager.removeUser(roomId, user.id, socket.id);

      const onlineUsers = presenceManager.getRoomOnlineUsers(roomId);
      io.to(roomId).emit('presence_update', {
        roomId,
        onlineUsers,
        totalOnline: onlineUsers.length,
      });

      if (isNowOffline) {
        socket.to(roomId).emit('user_left', {
          roomId,
          userId: user.id,
          displayName: user.displayName,
        });
      }

      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  /**
   * Handle sending a new message
   */
  socket.on('send_message', async (data, callback = () => {}) => {
    try {
      const { roomId, content, tempId, replyToId, gifUrl, attachmentUrl, attachmentType, audioDuration } = data || {};

      if (!roomId) {
        return callback({ success: false, error: 'roomId is required.' });
      }

      const cleanContent = sanitizeMessageContent(content || '');
      if (!gifUrl && !attachmentUrl) {
        const validation = validateMessageContent(cleanContent);
        if (!validation.valid) {
          return callback({ success: false, error: validation.error });
        }
      }

      const room = await prisma.room.findFirst({
        where: {
          OR: [{ id: roomId }, { name: roomId.toLowerCase() }],
        },
        select: { id: true },
      });

      if (!room) {
        return callback({ success: false, error: 'Room does not exist.' });
      }

      const actualRoomId = room.id;

      const savedMessage = await prisma.message.create({
        data: {
          roomId: actualRoomId,
          userId: user.id,
          content: cleanContent || (gifUrl ? 'GIF' : (attachmentType === 'audio' ? 'Voice Message' : 'Attachment')),
          gifUrl: gifUrl || null,
          attachmentUrl: attachmentUrl || null,
          attachmentType: attachmentType || null,
          audioDuration: audioDuration || null,
          replyToId: replyToId || null,
          reactions: {},
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
              avatarImage: true,
              presenceStatus: true,
              statusMessage: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              attachmentType: true,
              user: { select: { displayName: true } },
            },
          },
        },
      });

      const messagePayload = {
        id: savedMessage.id,
        roomId: savedMessage.roomId,
        userId: savedMessage.userId,
        content: savedMessage.content,
        gifUrl: savedMessage.gifUrl,
        attachmentUrl: savedMessage.attachmentUrl,
        attachmentType: savedMessage.attachmentType,
        audioDuration: savedMessage.audioDuration,
        replyTo: savedMessage.replyTo,
        reactions: savedMessage.reactions || {},
        createdAt: savedMessage.createdAt.toISOString(),
        user: savedMessage.user,
        tempId: tempId || null,
      };

      io.to(actualRoomId).emit('new_message', messagePayload);
      callback({ success: true, message: messagePayload });
    } catch (error) {
      console.error('Socket send_message error:', error);
      callback({ success: false, error: 'Failed to send message.' });
    }
  });

  /**
   * Handle Status Change
   */
  socket.on('status_update', async (data) => {
    try {
      const { presenceStatus, statusMessage } = data || {};
      if (presenceStatus) {
        user.presenceStatus = presenceStatus;
        if (statusMessage) user.statusMessage = statusMessage;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            presenceStatus,
            ...(statusMessage ? { statusMessage } : {}),
          },
        });

        io.emit('user_status_changed', {
          userId: user.id,
          presenceStatus,
          statusMessage: user.statusMessage,
        });
      }
    } catch (e) {
      console.warn('Status update error:', e.message);
    }
  });

  /**
   * Handle Emoji Reactions
   */
  socket.on('message_reaction', async (data, callback = () => {}) => {
    try {
      const { roomId, messageId, emoji } = data || {};
      if (!roomId || !messageId || !emoji) return;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { id: true, reactions: true },
      });

      if (!message) return;

      let reactions = (typeof message.reactions === 'object' && message.reactions !== null)
        ? { ...message.reactions }
        : {};

      let currentList = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
      const userIndex = currentList.findIndex((u) => u.id === user.id);

      if (userIndex >= 0) {
        currentList.splice(userIndex, 1);
        if (currentList.length === 0) {
          delete reactions[emoji];
        } else {
          reactions[emoji] = currentList;
        }
      } else {
        currentList.push({ id: user.id, displayName: user.displayName });
        reactions[emoji] = currentList;
      }

      await prisma.message.update({
        where: { id: messageId },
        data: { reactions },
      });

      io.to(roomId).emit('reaction_updated', {
        roomId,
        messageId,
        reactions,
      });

      callback({ success: true, reactions });
    } catch (err) {
      console.error('Reaction error:', err);
    }
  });

  /**
   * Handle deleting a message
   */
  socket.on('delete_message', async (data, callback = () => {}) => {
    try {
      const { roomId, messageId } = data || {};
      if (!roomId || !messageId) return;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message || message.userId !== user.id) {
        return callback({ success: false, error: 'Unauthorized to delete this message.' });
      }

      await prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true },
      });

      io.to(roomId).emit('message_deleted', {
        roomId,
        messageId,
      });

      callback({ success: true });
    } catch (err) {
      console.error('Delete message error:', err);
    }
  });

  /**
   * WebRTC Audio / Video Call Signaling (Complete Bidirectional Handshake)
   */
  socket.on('call_initiate', (data) => {
    const { roomId, roomName, callType } = data || {};
    if (!roomId) return;

    socket.to(roomId).emit('incoming_call', {
      roomId,
      roomName: roomName || 'Channel',
      callType: callType || 'video',
      caller: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        avatarImage: user.avatarImage,
      },
    });
  });

  socket.on('call_accept', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;

    // Broadcast call_accepted to all participants to stop ringtones and start WebRTC SDP exchange
    io.to(roomId).emit('call_accepted', {
      roomId,
      acceptedBy: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        avatarImage: user.avatarImage,
      },
    });
  });

  socket.on('call_signal', (data) => {
    const { roomId, signalData, type, targetUserId } = data || {};
    if (!roomId) return;

    socket.to(roomId).emit('call_signal', {
      roomId,
      fromUserId: user.id,
      fromUserName: user.displayName,
      targetUserId,
      signalData,
      type,
    });
  });

  socket.on('call_reject', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;

    socket.to(roomId).emit('call_rejected', {
      roomId,
      rejectedBy: user.displayName,
    });
  });

  socket.on('call_end', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;

    io.to(roomId).emit('call_ended', {
      roomId,
      endedBy: user.displayName,
    });
  });

  /**
   * Handle typing events
   */
  socket.on('typing_start', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;

    socket.to(roomId).emit('user_typing', {
      roomId,
      userId: user.id,
      displayName: user.displayName,
    });
  });

  socket.on('typing_stop', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;

    socket.to(roomId).emit('user_stop_typing', {
      roomId,
      userId: user.id,
    });
  });

  /**
   * Handle socket disconnect
   */
  socket.on('disconnect', () => {
    const affectedRooms = presenceManager.handleDisconnect(socket.id);

    for (const { roomId, onlineUsers, userBecameOffline } of affectedRooms) {
      io.to(roomId).emit('presence_update', {
        roomId,
        onlineUsers,
        totalOnline: onlineUsers.length,
      });

      if (userBecameOffline) {
        io.to(roomId).emit('user_left', {
          roomId,
          userId: user.id,
          displayName: user.displayName,
        });
      }
    }
  });
}
