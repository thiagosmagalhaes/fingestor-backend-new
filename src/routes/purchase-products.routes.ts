import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { purchaseProductsController } from '../controllers/purchase-orders.controller';

const router = Router();

router.use(authMiddleware);

router.get('/search', (req, res) => purchaseProductsController.search(req, res));
router.get('/list', (req, res) => purchaseProductsController.list(req, res));
router.post('/', (req, res) => purchaseProductsController.create(req, res));
router.put('/:id', (req, res) => purchaseProductsController.update(req, res));

export default router;
