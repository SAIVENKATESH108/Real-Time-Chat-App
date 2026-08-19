import { validationResult } from 'express-validator';

/**
 * Middleware to check express-validator validation errors.
 */
export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
}
