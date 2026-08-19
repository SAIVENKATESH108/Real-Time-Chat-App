import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

describe('Room Management Integration Tests', () => {
  let authCookie = '';
  let userId = '';
  const testRoomName = `test-room-${Date.now()}`;

  beforeAll(async () => {
    // Create test user
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `room_tester_${Date.now()}@example.com`,
        password: 'password123',
        displayName: 'Room Tester',
      });
    
    authCookie = res.headers['set-cookie'].find((c) => c.includes('chato_token'));
    userId = res.body.user.id;
  });

  afterAll(async () => {
    try {
      await prisma.room.deleteMany({
        where: { name: { contains: 'test-room-' } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: 'room_tester_' } },
      });
    } catch (e) {
      // ignore
    }
  });

  it('should create a new public chat room', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Cookie', [authCookie])
      .send({
        name: testRoomName,
        isPrivate: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.room).toBeDefined();
    expect(res.body.room.name).toBe(testRoomName);
    expect(res.body.room.createdBy).toBe(userId);
    expect(res.body.room.isMember).toBe(true);
  });

  it('should reject creating room with existing name (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Cookie', [authCookie])
      .send({
        name: testRoomName,
        isPrivate: false,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already exists');
  });

  it('should list accessible rooms', async () => {
    const res = await request(app)
      .get('/api/rooms')
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.rooms)).toBe(true);
    expect(res.body.rooms.some((r) => r.name === testRoomName)).toBe(true);
  });

  it('should get room details and member list', async () => {
    const res = await request(app)
      .get(`/api/rooms/${testRoomName}`)
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.room.name).toBe(testRoomName);
    expect(res.body.room.members.length).toBeGreaterThanOrEqual(1);
    expect(res.body.room.members.some((m) => m.userId === userId)).toBe(true);
  });
});
