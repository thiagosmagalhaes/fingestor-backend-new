import { Router } from 'express';
import budgetsController from '../controllers/budgets.controller';

const router = Router();

// Rotas públicas (não requerem autenticação)
// GET /public/budgets/:shareToken - Obter orçamento por share token
router.get('/:shareToken', (req, res) => budgetsController.getByShareToken(req, res));

export default router;
