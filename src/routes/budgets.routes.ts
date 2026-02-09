import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import budgetsController from '../controllers/budgets.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de budgets
router.get('/', (req, res) => budgetsController.getAll(req, res));
router.get('/:budgetId/status-history', (req, res) => budgetsController.getStatusHistory(req, res));
router.get('/:id', (req, res) => budgetsController.getById(req, res));
router.post('/', (req, res) => budgetsController.create(req, res));
router.put('/:id', (req, res) => budgetsController.update(req, res));
router.delete('/:id', (req, res) => budgetsController.delete(req, res));

export default router;
