import prisma from '../config/db.js';

/**
 * Search users by display name as username, username, or email.
 * GET /api/users/search?q=@username
 */
export async function searchUsers(req, res, next) {
  try {
    const rawQuery = (req.query.q || '').trim();
    const cleanQuery = rawQuery.startsWith('@') ? rawQuery.substring(1).trim() : rawQuery;
    const currentUserId = req.user.id;

    let whereCondition = {};

    if (cleanQuery && cleanQuery.length > 0) {
      whereCondition = {
        OR: [
          { displayName: { contains: cleanQuery, mode: 'insensitive' } },
          { username: { contains: cleanQuery, mode: 'insensitive' } },
          { email: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      };
    }

    const users = await prisma.user.findMany({
      where: whereCondition,
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
      take: 30,
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map((u) => ({
      ...u,
      username: u.displayName || u.username || u.email.split('@')[0],
      isSelf: u.id === currentUserId,
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get or create a 1-to-1 Direct Message conversation room (including Saved Notes / Message Yourself).
 * POST /api/users/dm
 */
export async function getOrCreateDM(req, res, next) {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    const actualTargetId = targetUserId || currentUserId;

    const targetUser = await prisma.user.findUnique({
      where: { id: actualTargetId },
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
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Target user not found.',
      });
    }

    const isSelf = actualTargetId === currentUserId;
    const sortedIds = isSelf ? [currentUserId, currentUserId] : [currentUserId, actualTargetId].sort();
    const dmRoomName = isSelf ? `dm-saved-${currentUserId}` : `dm-${sortedIds[0]}-${sortedIds[1]}`;

    let room = await prisma.room.findUnique({
      where: { name: dmRoomName },
      include: {
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
        },
      },
    });

    if (!room) {
      room = await prisma.$transaction(async (tx) => {
        const newRoom = await tx.room.create({
          data: {
            name: dmRoomName,
            topic: isSelf ? 'Personal Saved Notes & Cloud Storage' : `Direct conversation with @${targetUser.displayName}`,
            type: 'dm',
            isPrivate: true,
            createdBy: currentUserId,
          },
        });

        if (isSelf) {
          await tx.roomMember.create({
            data: { userId: currentUserId, roomId: newRoom.id, role: 'admin' },
          });
        } else {
          await tx.roomMember.createMany({
            data: [
              { userId: currentUserId, roomId: newRoom.id, role: 'admin' },
              { userId: actualTargetId, roomId: newRoom.id, role: 'member' },
            ],
          });
        }

        return tx.room.findUnique({
          where: { id: newRoom.id },
          include: {
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
            },
          },
        });
      });
    }

    const displayName = isSelf ? `@${targetUser.displayName} (Saved Notes)` : `@${targetUser.displayName}`;

    return res.status(200).json({
      success: true,
      room: {
        id: room.id,
        name: displayName,
        rawName: room.name,
        type: 'dm',
        isPrivate: true,
        targetUser: {
          ...targetUser,
          username: targetUser.displayName,
        },
        memberCount: room.members.length,
        members: room.members.map((m) => m.user),
      },
    });
  } catch (error) {
    next(error);
  }
}
