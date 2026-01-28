import { Router } from 'express';
import { UnsubscribeController } from '../controllers/unsubscribe.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const unsubscribeController = new UnsubscribeController();

// GET /api/unsubscribe?token=...
router.get('/', authMiddleware, unsubscribeController.unsubscribe.bind(unsubscribeController));

// POST /api/unsubscribe/resubscribe
router.post('/resubscribe', authMiddleware, unsubscribeController.resubscribe.bind(unsubscribeController));

// GET /api/unsubscribe/status?token=...
router.get('/status', authMiddleware, unsubscribeController.checkStatus.bind(unsubscribeController));

export default router;
