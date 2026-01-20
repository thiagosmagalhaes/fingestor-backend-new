import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import transactionsController from '../controllers/transactions.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de transactions
router.get('/', (req, res) => transactionsController.getAll(req, res));
router.get('/:id', (req, res) => transactionsController.getById(req, res));
router.post('/', (req, res) => transactionsController.create(req, res));
router.post('/bulk', (req, res) => transactionsController.createBulk(req, res));
router.put('/:id', (req, res) => transactionsController.update(req, res));
router.delete('/:id', (req, res) => transactionsController.delete(req, res));

export default router;
