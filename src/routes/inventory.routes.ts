import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import inventoryController from '../controllers/inventory.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de inventory
router.get('/movements', (req, res) => inventoryController.getMovements(req, res));
router.post('/add-stock', (req, res) => inventoryController.addStock(req, res));
router.post('/adjust-stock', (req, res) => inventoryController.adjustStock(req, res));

export default router;
