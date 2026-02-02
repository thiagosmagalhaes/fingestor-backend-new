import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import transactionsController from '../controllers/transactions.controller';
import { requireActiveSubscription } from '../middleware/requireSubscription';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de recurring transactions (devem vir ANTES das rotas com :id)
router.get('/recurring', (req, res) => transactionsController.getRecurringRules(req, res));
router.patch('/recurring/:id/pause', (req, res) => transactionsController.pauseRecurringRule(req, res));
router.patch('/recurring/:id/resume', (req, res) => transactionsController.resumeRecurringRule(req, res));
router.delete('/recurring/:id', (req, res) => transactionsController.cancelRecurringRule(req, res));

// Rotas de transactions
router.get('/', (req, res) => transactionsController.getAll(req, res));
router.get('/:id', (req, res) => transactionsController.getById(req, res));
router.post('/', requireActiveSubscription, (req, res) => transactionsController.create(req, res));
router.post('/bulk', requireActiveSubscription, (req, res) => transactionsController.createBulk(req, res));
router.post('/import', requireActiveSubscription, (req, res) => transactionsController.import(req, res));
router.put('/:id', (req, res) => transactionsController.update(req, res));
router.delete('/:id', (req, res) => transactionsController.delete(req, res));

export default router;
