import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import categoriesController from '../controllers/categories.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de categories
router.get('/', (req, res) => categoriesController.getAll(req, res));
router.get('/:id', (req, res) => categoriesController.getById(req, res));
router.post('/', (req, res) => categoriesController.create(req, res));
router.put('/:id', (req, res) => categoriesController.update(req, res));
router.delete('/:id', (req, res) => categoriesController.delete(req, res));

export default router;
