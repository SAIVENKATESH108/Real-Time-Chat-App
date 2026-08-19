import cookie from 'cookie';
import { config } from '../config/env.js';
import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

/**
 * Socket.io Handshake Authentication Middleware.
 * Rejects unauthenticated connections by validating JWT from httpOnly cookie or auth object.
 */
export async function socketAuthMiddleware(socket, next) {
  try {
    let token = null;

    // 1. Try extracting from Handshake Cookie header
    const cookieHeader = socket.handshake.headers?.cookie;
    if (cookieHeader) {
      const parsedCookies = cookie.parse(cookieHeader);
      token = parsedCookies[config.cookieName];
    }

    // 2. Fallback: check handshake auth object or query param
    if (!token && socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    }
    if (!token && socket.handshake.query?.token) {
      token = socket.handshake.query.token;
    }

    if (!token) {
      const authErr = new Error('Authentication required: Missing session token');
      authErr.data = { code: 'UNAUTHORIZED' };
      return next(authErr);
    }

    // Verify JWT
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      const authErr = new Error('Authentication failed: Invalid or expired session token');
      authErr.data = { code: 'INVALID_TOKEN' };
      return next(authErr);
    }

    // Fetch user from DB to ensure current state
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    if (!user) {
      const authErr = new Error('Authentication failed: User does not exist');
      authErr.data = { code: 'USER_NOT_FOUND' };
      return next(authErr);
    }

    // Attach authenticated user to socket instance
    socket.user = user;
    next();
  } catch (error) {
    const authErr = new Error('Authentication failed due to internal error');
    authErr.data = { code: 'INTERNAL_ERROR' };
    next(authErr);
  }
}
