import prisma from '../config/db.js';

/**
 * Normalizes room name (lowercase, trim, slug format).
 */
function normalizeRoomName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Create a new chat room or channel.
 * POST /api/rooms
 */
export async function createRoom(req, res, next) {
  try {
    const { name, isPrivate = false, topic = '', parentId = null } = req.body;
    const userId = req.user.id;

    const formattedName = normalizeRoomName(name);
    if (!formattedName || formattedName.length < 2 || formattedName.length > 30) {
      return res.status(400).json({
        success: false,
        error: 'Room name must be between 2 and 30 characters (letters, numbers, hyphens).',
      });
    }

    // Check if room name is already taken
    const existing = await prisma.room.findUnique({
      where: { name: formattedName },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Room "${formattedName}" already exists. Please choose another name or join it.`,
      });
    }

    // Create room and add creator as admin member
    const newRoom = await prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          name: formattedName,
          topic: topic || '',
          type: parentId ? 'subchannel' : 'channel',
          isPrivate: Boolean(isPrivate),
          createdBy: userId,
          parentId: parentId || null,
        },
      });

      await tx.roomMember.create({
        data: {
          userId,
          roomId: room.id,
          role: 'admin',
        },
      });

      return room;
    });

    return res.status(201).json({
      success: true,
      message: 'Room created successfully.',
      room: {
        ...newRoom,
        memberCount: 1,
        isMember: true,
        role: 'admin',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all accessible rooms (public rooms + private rooms / DMs user belongs to) with Sub-Channels.
 * GET /api/rooms
 */
export async function getRooms(req, res, next) {
  try {
    const userId = req.user.id;
    const search = (req.query.search || '').trim().toLowerCase();

    // Query rooms: public OR private where user is a member
    const rooms = await prisma.room.findMany({
      where: {
        AND: [
          search ? { name: { contains: search, mode: 'insensitive' } } : {},
          {
            OR: [
              { isPrivate: false },
              {
                members: {
                  some: { userId },
                },
              },
            ],
          },
        ],
      },
      include: {
        _count: {
          select: { members: true, messages: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
                avatarImage: true,
                presenceStatus: true,
                statusMessage: true,
              },
            },
          },
        },
        subChannels: {
          select: {
            id: true,
            name: true,
            topic: true,
            isPrivate: true,
            createdAt: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            attachmentType: true,
            createdAt: true,
            user: { select: { displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedRooms = rooms.map((room) => {
      const isMember = room.members.some((m) => m.userId === userId);
      const userMembership = room.members.find((m) => m.userId === userId);

      let displayName = room.name;
      let targetUser = null;

      // Format DM rooms nicely
      if (room.type === 'dm') {
        const otherMember = room.members.find((m) => m.userId !== userId) || room.members[0];
        if (otherMember) {
          displayName = `@${otherMember.user.displayName}`;
          targetUser = otherMember.user;
        }
      }

      return {
        id: room.id,
        name: displayName,
        rawName: room.name,
        topic: room.topic || '',
        type: room.type || 'channel',
        parentId: room.parentId,
        subChannels: room.subChannels || [],
        isPrivate: room.isPrivate,
        createdBy: room.createdBy,
        createdAt: room.createdAt,
        memberCount: room._count.members,
        messageCount: room._count.messages,
        isMember,
        role: userMembership?.role || (room.createdBy === userId ? 'admin' : 'member'),
        lastMessage: room.messages[0] || null,
        targetUser,
      };
    });

    return res.status(200).json({
      success: true,
      rooms: formattedRooms,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get room details, member list, and sub-channels.
 * GET /api/rooms/:roomId
 */
export async function getRoomById(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await prisma.room.findFirst({
      where: {
        OR: [{ id: roomId }, { name: roomId.toLowerCase() }],
      },
      include: {
        creator: {
          select: { id: true, displayName: true, email: true, avatarUrl: true, avatarImage: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                email: true,
                avatarUrl: true,
                avatarImage: true,
                presenceStatus: true,
                statusMessage: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        subChannels: {
          select: {
            id: true,
            name: true,
            topic: true,
            isPrivate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found.',
      });
    }

    const membership = room.members.find((m) => m.userId === userId);
    const isMember = Boolean(membership);

    if (room.isPrivate && !isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You are not a member of this private room.',
      });
    }

    return res.status(200).json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        topic: room.topic || '',
        type: room.type,
        parentId: room.parentId,
        subChannels: room.subChannels || [],
        isPrivate: room.isPrivate,
        createdBy: room.createdBy,
        creator: room.creator,
        createdAt: room.createdAt,
        isMember,
        role: membership?.role || (room.createdBy === userId ? 'admin' : 'member'),
        memberCount: room.members.length,
        members: room.members.map((m) => ({
          userId: m.user.id,
          displayName: m.user.displayName,
          username: m.user.username,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          avatarImage: m.user.avatarImage,
          presenceStatus: m.user.presenceStatus,
          statusMessage: m.user.statusMessage,
          role: m.role || (m.userId === room.createdBy ? 'admin' : 'member'),
          joinedAt: m.joinedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update room settings (Admin only).
 * PUT /api/rooms/:roomId
 */
export async function updateRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const { name, topic, isPrivate } = req.body;
    const userId = req.user.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { where: { userId } },
      },
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const isAdmin = room.createdBy === userId || room.members.some((m) => m.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Only channel admins can modify channel settings.' });
    }

    const updateData = {};
    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updateData.name = normalizeRoomName(name);
    }
    if (topic !== undefined) {
      updateData.topic = topic.trim();
    }
    if (isPrivate !== undefined) {
      updateData.isPrivate = Boolean(isPrivate);
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'Channel settings updated.',
      room: updatedRoom,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a sub-channel under parent channel.
 * POST /api/rooms/:roomId/subchannels
 */
export async function createSubchannel(req, res, next) {
  try {
    const { roomId } = req.params;
    const { name, topic = '' } = req.body;
    const userId = req.user.id;

    const parentRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: { where: { userId } } },
    });

    if (!parentRoom) {
      return res.status(404).json({ success: false, error: 'Parent room not found.' });
    }

    const formattedName = `${parentRoom.name}-${normalizeRoomName(name)}`;

    const subChannel = await prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          name: formattedName,
          topic: topic || '',
          type: 'subchannel',
          isPrivate: parentRoom.isPrivate,
          parentId: parentRoom.id,
          createdBy: userId,
        },
      });

      await tx.roomMember.create({
        data: {
          userId,
          roomId: room.id,
          role: 'admin',
        },
      });

      return room;
    });

    return res.status(201).json({
      success: true,
      message: 'Sub-channel created successfully.',
      room: subChannel,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Kick a member from a room (Admin only).
 * DELETE /api/rooms/:roomId/members/:targetUserId
 */
export async function kickMember(req, res, next) {
  try {
    const { roomId, targetUserId } = req.params;
    const currentUserId = req.user.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { where: { userId: currentUserId } },
      },
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const isAdmin = room.createdBy === currentUserId || room.members.some((m) => m.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Only channel admins can remove members.' });
    }

    if (targetUserId === room.createdBy) {
      return res.status(400).json({ success: false, error: 'Cannot kick the room owner/creator.' });
    }

    await prisma.roomMember.deleteMany({
      where: {
        roomId,
        userId: targetUserId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Member removed from channel successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Promote or Demote member role (Admin only).
 * PUT /api/rooms/:roomId/members/:targetUserId/role
 */
export async function updateMemberRole(req, res, next) {
  try {
    const { roomId, targetUserId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;

    if (!['admin', 'moderator', 'member'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role.' });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: { where: { userId: currentUserId } },
      },
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const isAdmin = room.createdBy === currentUserId || room.members.some((m) => m.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Only channel admins can assign roles.' });
    }

    await prisma.roomMember.update({
      where: {
        userId_roomId: {
          userId: targetUserId,
          roomId,
        },
      },
      data: { role },
    });

    return res.status(200).json({
      success: true,
      message: `Member role updated to ${role}.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a room (Admin only).
 * DELETE /api/rooms/:roomId
 */
export async function deleteRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const currentUserId = req.user.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    if (room.name === 'general') {
      return res.status(400).json({ success: false, error: 'Cannot delete the default general channel.' });
    }

    if (room.createdBy !== currentUserId) {
      return res.status(403).json({ success: false, error: 'Only the room creator can delete this channel.' });
    }

    await prisma.room.delete({
      where: { id: roomId },
    });

    return res.status(200).json({
      success: true,
      message: 'Channel deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Join a room.
 * POST /api/rooms/:roomId/join
 */
export async function joinRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

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

    // Add membership
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
        role: 'member',
      },
      update: {},
    });

    return res.status(200).json({
      success: true,
      message: `Joined room "${room.name}" successfully.`,
      roomId: room.id,
      roomName: room.name,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Leave a room.
 * POST /api/rooms/:roomId/leave
 */
export async function leaveRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    await prisma.roomMember.deleteMany({
      where: {
        userId,
        roomId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Left room successfully.',
    });
  } catch (error) {
    next(error);
  }
}
