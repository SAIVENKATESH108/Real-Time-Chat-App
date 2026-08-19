import { config } from '../config/env.js';
import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

/**
 * Express middleware to authenticate REST API requests via httpOnly cookie or Authorization header.
 */
export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.[config.cookieName];

    // Fallback: Check Authorization header (Bearer token)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid token. Please log in again.',
      });
    }

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
