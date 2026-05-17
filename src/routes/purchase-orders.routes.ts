import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { purchaseOrdersController } from '../controllers/purchase-orders.controller';

const router = Router();

router.use(authMiddleware);

// NOTE: /suggestions must be declared before /:id to avoid route collision
router.get('/suggestions', (req, res) => purchaseOrdersController.getSuggestions(req, res));
router.get('/', (req, res) => purchaseOrdersController.list(req, res));
router.get('/:id', (req, res) => purchaseOrdersController.getById(req, res));
router.get('/:id/whatsapp-message', (req, res) => purchaseOrdersController.getWhatsAppMessage(req, res));
router.post('/', (req, res) => purchaseOrdersController.create(req, res));
router.put('/:id', (req, res) => purchaseOrdersController.update(req, res));
router.post('/:id/cancel', (req, res) => purchaseOrdersController.cancel(req, res));

export default router;
