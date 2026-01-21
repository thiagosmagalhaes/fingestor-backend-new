import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import companiesController from '../controllers/companies.controller';
import { requireActiveSubscription } from '../middleware/requireSubscription';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de companies
router.get('/', (req, res) => companiesController.getAll(req, res));
router.get('/:id', (req, res) => companiesController.getById(req, res));
router.post('/', requireActiveSubscription, (req, res) => companiesController.create(req, res));
router.put('/:id', requireActiveSubscription, (req, res) => companiesController.update(req, res));
router.delete('/:id', (req, res) => companiesController.delete(req, res));

export default router;
