import { config } from '../config/env.js';

/**
 * Centralized Express error-handling middleware.
 */
export function errorHandler(err, req, res, next) {
  // Log error in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled Server Error:', err);
  }

  // Handle Prisma unique constraint violation (e.g. unique email or room name)
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({
      success: false,
      error: `A record with this ${field} already exists.`,
    });
  }

  // Handle Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Requested resource was not found.',
    });
  }

  // Handle Bad JSON syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload provided.',
    });
  }

  // Custom status code if assigned
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
}
