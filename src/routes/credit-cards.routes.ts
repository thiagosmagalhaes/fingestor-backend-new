import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import creditCardsController from '../controllers/credit-cards.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de credit cards
router.get('/', (req, res) => creditCardsController.getAll(req, res));
router.get('/:id', (req, res) => creditCardsController.getById(req, res));
router.get('/:id/statement', (req, res) => creditCardsController.getStatement(req, res));
router.put('/:id/statement/pay', (req, res) => creditCardsController.payInvoice(req, res));
router.post('/', (req, res) => creditCardsController.create(req, res));
router.put('/:id', (req, res) => creditCardsController.update(req, res));
router.delete('/:id', (req, res) => creditCardsController.delete(req, res));

export default router;
