import prisma from '../config/db.js';
import { sanitizeMessageContent, validateMessageContent } from '../utils/sanitize.js';

/**
 * Get paginated chat history for a room (cursor-based pagination).
 * Default: Loads last 50 messages.
 * 
 * GET /api/rooms/:roomId/messages
 */
export async function getRoomMessages(req, res, next) {
  try {
    const { roomId } = req.params;
    const cursor = req.query.cursor ? String(req.query.cursor) : null;
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);

    const room = await prisma.room.findFirst({
      where: {
        OR: [{ id: roomId }, { name: roomId.toLowerCase() }],
      },
      select: { id: true, isPrivate: true },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found.',
      });
    }

    const actualRoomId = room.id;
    let cursorCondition = {};

    if (cursor) {
      const cursorMsg = await prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (cursorMsg) {
        cursorCondition = {
          createdAt: {
            lt: cursorMsg.createdAt,
          },
        };
      }
    }

    const messages = await prisma.message.findMany({
      where: {
        roomId: actualRoomId,
        isDeleted: false,
        ...cursorCondition,
      },
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
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

    const hasMore = messages.length > limit;
    const paginatedMessages = hasMore ? messages.slice(0, limit) : messages;
    const chronologicalMessages = paginatedMessages.reverse();
    const nextCursor = hasMore && chronologicalMessages.length > 0 ? chronologicalMessages[0].id : null;

    return res.status(200).json({
      success: true,
      messages: chronologicalMessages,
      hasMore,
      nextCursor,
      count: chronologicalMessages.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * REST Fallback endpoint to send a message to a room.
 * POST /api/rooms/:roomId/messages
 */
export async function createMessageFallback(req, res, next) {
  try {
    const { roomId } = req.params;
    const { content, replyToId, gifUrl, attachmentUrl, attachmentType, audioDuration } = req.body;
    const userId = req.user.id;

    const cleanContent = sanitizeMessageContent(content || '');
    if (!gifUrl && !attachmentUrl) {
      const validation = validateMessageContent(cleanContent);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
        });
      }
    }

    const room = await prisma.room.findFirst({
      where: {
        OR: [{ id: roomId }, { name: roomId.toLowerCase() }],
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found.',
      });
    }

    await prisma.roomMember.upsert({
      where: {
        userId_roomId: {
          userId,
          roomId: room.id,
        },
      },
      create: {
        userId,
        roomId: room.id,
      },
      update: {},
    });

    const message = await prisma.message.create({
      data: {
        roomId: room.id,
        userId,
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

    return res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Fetch missed messages since a specific message ID (Reconnection Sync).
 * GET /api/rooms/:roomId/sync?lastMessageId=<id>
 */
export async function syncMissedMessages(req, res, next) {
  try {
    const { roomId } = req.params;
    const { lastMessageId } = req.query;

    if (!lastMessageId) {
      return res.status(400).json({
        success: false,
        error: 'lastMessageId query parameter is required for message sync.',
      });
    }

    const room = await prisma.room.findFirst({
      where: {
        OR: [{ id: roomId }, { name: roomId.toLowerCase() }],
      },
      select: { id: true },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found.',
      });
    }

    const lastMsg = await prisma.message.findUnique({
      where: { id: String(lastMessageId) },
      select: { createdAt: true },
    });

    let missedMessages = [];
    if (lastMsg) {
      missedMessages = await prisma.message.findMany({
        where: {
          roomId: room.id,
          isDeleted: false,
          createdAt: {
            gt: lastMsg.createdAt,
          },
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
    }

    return res.status(200).json({
      success: true,
      missedMessages,
      count: missedMessages.length,
    });
  } catch (error) {
    next(error);
  }
}
