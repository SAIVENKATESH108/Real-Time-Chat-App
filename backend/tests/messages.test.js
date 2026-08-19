import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

describe('Message History & REST Fallback Integration Tests', () => {
  let authCookie = '';
  let testRoomId = '';
  const testRoomName = `msg-room-${Date.now()}`;

  beforeAll(async () => {
    // Signup user
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `msg_tester_${Date.now()}@example.com`,
        password: 'password123',
        displayName: 'Msg Tester',
      });
    
    authCookie = signupRes.headers['set-cookie'].find((c) => c.includes('chato_token'));

    // Create room
    const roomRes = await request(app)
      .post('/api/rooms')
      .set('Cookie', [authCookie])
      .send({ name: testRoomName, isPrivate: false });
    
    testRoomId = roomRes.body.room.id;
  });

  afterAll(async () => {
    try {
      await prisma.room.deleteMany({
        where: { name: { contains: 'msg-room-' } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: 'msg_tester_' } },
      });
    } catch (e) {
      // ignore
    }
  });

  it('should send a message via REST fallback endpoint', async () => {
    const res = await request(app)
      .post(`/api/rooms/${testRoomId}/messages`)
      .set('Cookie', [authCookie])
      .send({
        content: 'Hello via REST fallback!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message.content).toBe('Hello via REST fallback!');
    expect(res.body.message.user).toBeDefined();
  });

  it('should sanitize XSS HTML in message content before storing', async () => {
    const res = await request(app)
      .post(`/api/rooms/${testRoomId}/messages`)
      .set('Cookie', [authCookie])
      .send({
        content: '<script>alert("hacked")</script><b>Safe message</b><img src=x onerror=alert(1)>',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message.content).toBe('Safe message');
    expect(res.body.message.content).not.toContain('<script>');
    expect(res.body.message.content).not.toContain('<img');
  });

  it('should reject empty or whitespace-only messages with 400', async () => {
    const res = await request(app)
      .post(`/api/rooms/${testRoomId}/messages`)
      .set('Cookie', [authCookie])
      .send({
        content: '   \n  \t  ',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should get paginated message history for the room', async () => {
    // Post multiple messages
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post(`/api/rooms/${testRoomId}/messages`)
        .set('Cookie', [authCookie])
        .send({ content: `Pagination message ${i}` });
    }

    const res = await request(app)
      .get(`/api/rooms/${testRoomId}/messages?limit=3`)
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBe(3);
    expect(res.body.hasMore).toBe(true);
    expect(res.body.nextCursor).toBeDefined();
  });

  it('should fetch missed messages on reconnection sync', async () => {
    // Get latest message id
    const historyRes = await request(app)
      .get(`/api/rooms/${testRoomId}/messages?limit=1`)
      .set('Cookie', [authCookie]);
    
    const oldestInBatch = historyRes.body.messages[0];

    // Post a new message
    await request(app)
      .post(`/api/rooms/${testRoomId}/messages`)
      .set('Cookie', [authCookie])
      .send({ content: 'Missed message while offline' });

    // Reconnection sync
    const syncRes = await request(app)
      .get(`/api/rooms/${testRoomId}/sync?lastMessageId=${oldestInBatch.id}`)
      .set('Cookie', [authCookie]);

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.success).toBe(true);
    expect(syncRes.body.missedMessages.length).toBeGreaterThanOrEqual(1);
    expect(syncRes.body.missedMessages.some((m) => m.content === 'Missed message while offline')).toBe(true);
  });
});
