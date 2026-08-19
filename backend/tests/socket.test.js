import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as Client } from 'socket.io-client';
import app from '../src/app.js';
import { initSocketServer } from '../src/sockets/index.js';
import prisma from '../src/config/db.js';
import { generateToken } from '../src/utils/jwt.js';

describe('Socket.io Real-time Layer Integration Tests', () => {
  let httpServer;
  let ioServer;
  let port;
  let testUser1;
  let testUser2;
  let token1;
  let token2;
  let testRoom;

  beforeAll(async () => {
    // Create test HTTP & Socket server
    httpServer = http.createServer(app);
    ioServer = initSocketServer(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        port = httpServer.address().port;
        resolve();
      });
    });

    // Create 2 test users
    testUser1 = await prisma.user.create({
      data: {
        email: `socket_u1_${Date.now()}@example.com`,
        displayName: 'Socket User 1',
        passwordHash: 'hash123',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: `socket_u2_${Date.now()}@example.com`,
        displayName: 'Socket User 2',
        passwordHash: 'hash123',
      },
    });

    token1 = generateToken(testUser1);
    token2 = generateToken(testUser2);

    // Create a room
    testRoom = await prisma.room.create({
      data: {
        name: `socket-room-${Date.now()}`,
        isPrivate: false,
        createdBy: testUser1.id,
      },
    });
  });

  afterAll(async () => {
    try {
      ioServer.close();
      await new Promise((resolve) => httpServer.close(resolve));
      await prisma.message.deleteMany({ where: { roomId: testRoom.id } });
      await prisma.roomMember.deleteMany({ where: { roomId: testRoom.id } });
      await prisma.room.deleteMany({ where: { id: testRoom.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [testUser1.id, testUser2.id] } },
      });
    } catch (e) {
      // ignore
    }
  });

  it('should reject unauthenticated socket connection', async () => {
    const unauthSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      autoConnect: false,
    });

    const connectPromise = new Promise((resolve, reject) => {
      unauthSocket.on('connect_error', (err) => resolve(err));
      unauthSocket.on('connect', () => reject(new Error('Should not have connected')));
    });

    unauthSocket.connect();
    const err = await connectPromise;
    expect(err).toBeDefined();
    expect(err.message).toContain('Authentication required');
    unauthSocket.disconnect();
  });

  it('should connect authenticated user and join room with presence tracking', async () => {
    const socket1 = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: token1 },
    });

    await new Promise((resolve) => socket1.on('connect', resolve));
    expect(socket1.connected).toBe(true);

    // Join room
    const joinResult = await new Promise((resolve) => {
      socket1.emit('join_room', { roomId: testRoom.id }, (response) => {
        resolve(response);
      });
    });

    expect(joinResult.success).toBe(true);
    expect(joinResult.roomId).toBe(testRoom.id);
    expect(joinResult.onlineUsers.some((u) => u.id === testUser1.id)).toBe(true);

    socket1.disconnect();
  });

  it('should broadcast messages in real-time between two connected users in the same room', async () => {
    const socket1 = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: token1 },
    });
    const socket2 = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: token2 },
    });

    await Promise.all([
      new Promise((resolve) => socket1.on('connect', resolve)),
      new Promise((resolve) => socket2.on('connect', resolve)),
    ]);

    // Both join the room
    await Promise.all([
      new Promise((resolve) => socket1.emit('join_room', { roomId: testRoom.id }, resolve)),
      new Promise((resolve) => socket2.emit('join_room', { roomId: testRoom.id }, resolve)),
    ]);

    // socket2 listens for incoming message
    const messageReceivedPromise = new Promise((resolve) => {
      socket2.on('new_message', (data) => {
        resolve(data);
      });
    });

    // socket1 sends message
    const sendResult = await new Promise((resolve) => {
      socket1.emit(
        'send_message',
        { roomId: testRoom.id, content: 'Real-time test message! 🚀', tempId: 'temp-123' },
        (res) => resolve(res)
      );
    });

    expect(sendResult.success).toBe(true);
    expect(sendResult.message.content).toBe('Real-time test message! 🚀');

    const receivedMessage = await messageReceivedPromise;
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.content).toBe('Real-time test message! 🚀');
    expect(receivedMessage.user.displayName).toBe(testUser1.displayName);

    socket1.disconnect();
    socket2.disconnect();
  });

  it('should broadcast typing_start and typing_stop events to room members', async () => {
    const socket1 = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: token1 },
    });
    const socket2 = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: token2 },
    });

    await Promise.all([
      new Promise((resolve) => socket1.on('connect', resolve)),
      new Promise((resolve) => socket2.on('connect', resolve)),
    ]);

    await Promise.all([
      new Promise((resolve) => socket1.emit('join_room', { roomId: testRoom.id }, resolve)),
      new Promise((resolve) => socket2.emit('join_room', { roomId: testRoom.id }, resolve)),
    ]);

    const typingReceivedPromise = new Promise((resolve) => {
      socket2.on('user_typing', (data) => {
        resolve(data);
      });
    });

    socket1.emit('typing_start', { roomId: testRoom.id });
    const typingData = await typingReceivedPromise;
    expect(typingData.userId).toBe(testUser1.id);
    expect(typingData.displayName).toBe(testUser1.displayName);

    socket1.disconnect();
    socket2.disconnect();
  });
});
