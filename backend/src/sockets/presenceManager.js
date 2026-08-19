/**
 * In-Memory Presence Manager
 * Tracks connected users per room and handles multi-socket/multi-tab connections per user cleanly.
 */
class PresenceManager {
  constructor() {
    // Map<roomId, Map<userId, { count: number, user: { id, displayName, email } }>>
    this.roomPresence = new Map();

    // Map<socketId, { userId: string, rooms: Set<roomId> }>
    this.socketToRooms = new Map();
  }

  /**
   * Add a socket connection to a room.
   */
  addUser(roomId, user, socketId) {
    if (!roomId || !user?.id) return;

    // Track room presence
    if (!this.roomPresence.has(roomId)) {
      this.roomPresence.set(roomId, new Map());
    }

    const roomUsers = this.roomPresence.get(roomId);
    if (roomUsers.has(user.id)) {
      const existing = roomUsers.get(user.id);
      existing.count += 1;
    } else {
      roomUsers.set(user.id, {
        count: 1,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
        },
      });
    }

    // Track socket to room mapping for fast disconnect cleanup
    if (!this.socketToRooms.has(socketId)) {
      this.socketToRooms.set(socketId, {
        userId: user.id,
        rooms: new Set(),
      });
    }
    this.socketToRooms.get(socketId).rooms.add(roomId);
  }

  /**
   * Remove a socket connection from a specific room.
   * Returns true if user is completely offline in that room (count == 0).
   */
  removeUser(roomId, userId, socketId) {
    if (this.socketToRooms.has(socketId)) {
      this.socketToRooms.get(socketId).rooms.delete(roomId);
    }

    if (!this.roomPresence.has(roomId)) return false;

    const roomUsers = this.roomPresence.get(roomId);
    if (!roomUsers.has(userId)) return false;

    const userEntry = roomUsers.get(userId);
    userEntry.count -= 1;

    if (userEntry.count <= 0) {
      roomUsers.delete(userId);
      if (roomUsers.size === 0) {
        this.roomPresence.delete(roomId);
      }
      return true; // user is now offline in this room
    }

    return false;
  }

  /**
   * Returns list of currently active users in a room.
   */
  getRoomOnlineUsers(roomId) {
    if (!this.roomPresence.has(roomId)) return [];
    const roomUsers = this.roomPresence.get(roomId);
    return Array.from(roomUsers.values()).map((entry) => entry.user);
  }

  /**
   * Handle socket disconnect event and clean up across all rooms.
   * Returns array of { roomId, onlineUsers, userBecameOffline: boolean }
   */
  handleDisconnect(socketId) {
    const socketInfo = this.socketToRooms.get(socketId);
    if (!socketInfo) return [];

    const { userId, rooms } = socketInfo;
    const affectedRooms = [];

    for (const roomId of rooms) {
      const isNowOffline = this.removeUser(roomId, userId, socketId);
      affectedRooms.push({
        roomId,
        onlineUsers: this.getRoomOnlineUsers(roomId),
        userBecameOffline: isNowOffline,
        userId,
      });
    }

    this.socketToRooms.delete(socketId);
    return affectedRooms;
  }
}

export const presenceManager = new PresenceManager();
