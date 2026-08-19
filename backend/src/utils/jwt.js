import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generate a signed JWT for an authenticated user.
 * 
 * @param {object} payload - { id, email, displayName }
 * @returns {string} Signed JWT
 */
export function generateToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      displayName: payload.displayName,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * Verify and decode a JWT.
 * 
 * @param {string} token
 * @returns {object|null} Decoded payload or null if invalid/expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
}

/**
 * Sets the httpOnly session cookie on the Express response.
 * 
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setAuthCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.isProduction, // secure in production (HTTPS)
    sameSite: config.isProduction ? 'none' : 'lax', // 'none' for cross-domain production, 'lax' for local dev
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clears the auth cookie on logout.
 * 
 * @param {import('express').Response} res
 */
export function clearAuthCookie(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    path: '/',
  });
}
