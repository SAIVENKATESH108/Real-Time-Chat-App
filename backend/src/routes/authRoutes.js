import express from 'express';
import { body } from 'express-validator';
import { signup, login, logout, getMe, updateProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = express.Router();

// Signup Route
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    body('displayName').trim().isLength({ min: 2, max: 50 }).withMessage('Display name must be between 2 and 50 characters.'),
    validateRequest,
  ],
  signup
);

// Login Route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
    validateRequest,
  ],
  login
);

// Logout Route
router.post('/logout', logout);

// Get Current User Profile
router.get('/me', requireAuth, getMe);

// Update Profile & Settings
router.put('/profile', requireAuth, updateProfile);

export default router;
