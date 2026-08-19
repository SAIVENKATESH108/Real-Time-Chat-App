import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  createSubchannel,
  kickMember,
  updateMemberRole,
  deleteRoom,
  joinRoom,
  leaveRoom,
} from '../controllers/roomController.js';
import {
  getRoomMessages,
  createMessageFallback,
  syncMissedMessages,
} from '../controllers/messageController.js';

const router = Router();

// Protect all room routes
router.use(requireAuth);

router.post('/', createRoom);
router.get('/', getRooms);
router.get('/:roomId', getRoomById);
router.put('/:roomId', updateRoom);
router.delete('/:roomId', deleteRoom);
router.post('/:roomId/subchannels', createSubchannel);
router.post('/:roomId/join', joinRoom);
router.post('/:roomId/leave', leaveRoom);
router.delete('/:roomId/members/:targetUserId', kickMember);
router.put('/:roomId/members/:targetUserId/role', updateMemberRole);

// Messages endpoints
router.get('/:roomId/messages', getRoomMessages);
router.post('/:roomId/messages', createMessageFallback);
router.get('/:roomId/sync', syncMissedMessages);

export default router;
