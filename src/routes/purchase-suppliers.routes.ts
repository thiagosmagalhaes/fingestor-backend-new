import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { purchaseSuppliersController } from '../controllers/purchase-orders.controller';

const router = Router();

router.use(authMiddleware);

router.get('/search', (req, res) => purchaseSuppliersController.search(req, res));
router.get('/list', (req, res) => purchaseSuppliersController.list(req, res));

export default router;
