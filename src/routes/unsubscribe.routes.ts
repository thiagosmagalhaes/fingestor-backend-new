import { Router } from 'express';
import { UnsubscribeController } from '../controllers/unsubscribe.controller';

const router = Router();
const unsubscribeController = new UnsubscribeController();

// GET /api/unsubscribe?token=...
router.get('/', unsubscribeController.unsubscribe.bind(unsubscribeController));

// POST /api/unsubscribe/resubscribe
router.post('/resubscribe', unsubscribeController.resubscribe.bind(unsubscribeController));

// GET /api/unsubscribe/status?token=...
router.get('/status', unsubscribeController.checkStatus.bind(unsubscribeController));

export default router;
