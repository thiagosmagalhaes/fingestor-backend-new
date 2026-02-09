import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import salesController from '../controllers/sales.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de sales
router.get('/', (req, res) => salesController.getAll(req, res));
router.get('/:id', (req, res) => salesController.getById(req, res));
router.post('/', (req, res) => salesController.create(req, res));
router.post('/convert-budget', (req, res) => salesController.convertFromBudget(req, res));
router.post('/:id/cancel', (req, res) => salesController.cancel(req, res));
router.post('/installments/:id/pay', (req, res) => salesController.payInstallment(req, res));
router.put('/:id', (req, res) => salesController.update(req, res));

export default router;
