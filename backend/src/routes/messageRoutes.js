import express from 'express';
import { body } from 'express-validator';
import {
  getRoomMessages,
  createMessageFallback,
  syncMissedMessages,
} from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = express.Router();

// All message routes require authentication
router.use(requireAuth);

// Get paginated room messages (cursor-based)
router.get('/:roomId/messages', getRoomMessages);

// Send message via REST fallback
router.post(
  '/:roomId/messages',
  [
    body('content').trim().notEmpty().withMessage('Message content cannot be empty.'),
    validateRequest,
  ],
  createMessageFallback
);

// Fetch missed messages on client reconnection
router.get('/:roomId/sync', syncMissedMessages);

export default router;
