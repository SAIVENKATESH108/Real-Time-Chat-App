import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

describe('Auth Integration Tests', () => {
  const testUser = {
    email: `test_auth_${Date.now()}@example.com`,
    password: 'password123',
    displayName: 'Test Auth User',
  };

  let authCookie = '';

  beforeAll(async () => {
    // Clean up test users if needed
    try {
      await prisma.user.deleteMany({
        where: { email: { contains: 'test_auth_' } },
      });
    } catch (e) {
      // ignore
    }
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: { contains: 'test_auth_' } },
      });
    } catch (e) {
      // ignore
    }
  });

  it('should successfully register a new user and set auth cookie', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.displayName).toBe(testUser.displayName);
    expect(res.body.user.passwordHash).toBeUndefined();

    // Check Set-Cookie header
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('chato_token'))).toBe(true);
    authCookie = cookies.find((c) => c.includes('chato_token'));
  });

  it('should reject signup with duplicate email (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already exists');
  });

  it('should reject signup with invalid or short password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'shortpass@example.com',
        password: '123',
        displayName: 'Short Pass',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should successfully login existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should get current authenticated user via /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it('should reject unauthenticated request to /api/auth/me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should clear cookie on logout', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should permanently delete account and wipe user data from database', async () => {
    // 1. Create a user to be deleted
    const deleteCandidate = {
      email: `todelete_${Date.now()}@example.com`,
      password: 'password123',
      displayName: 'To Be Deleted',
    };

    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send(deleteCandidate);

    expect(signupRes.status).toBe(201);
    const delCookie = signupRes.headers['set-cookie'].find((c) => c.includes('chato_token'));
    const delUserId = signupRes.body.user.id;

    // 2. Delete account
    const deleteRes = await request(app)
      .delete('/api/auth/account')
      .set('Cookie', [delCookie]);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // 3. Verify user no longer exists in database
    const dbCheck = await prisma.user.findUnique({
      where: { id: delUserId },
    });
    expect(dbCheck).toBeNull();
  });
});
