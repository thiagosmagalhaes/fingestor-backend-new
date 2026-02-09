import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import customersController from '../controllers/customers.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de customers
router.get('/', (req, res) => customersController.getAll(req, res));
router.get('/search', (req, res) => customersController.search(req, res));
router.get('/:id', (req, res) => customersController.getById(req, res));
router.get('/:id/interactions', (req, res) => customersController.getInteractions(req, res));
router.post('/', (req, res) => customersController.create(req, res));
router.post('/:id/interactions', (req, res) => customersController.createInteraction(req, res));
router.put('/:id', (req, res) => customersController.update(req, res));
router.delete('/:id', (req, res) => customersController.delete(req, res));

export default router;
