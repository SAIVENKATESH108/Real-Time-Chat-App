import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { searchUsers, getOrCreateDM } from '../controllers/userController.js';

const router = Router();

router.use(requireAuth);

router.get('/search', searchUsers);
router.post('/dm', getOrCreateDM);

export default router;
