import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import productCategoriesController from '../controllers/product-categories.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de product_categories
router.get('/', (req, res) => productCategoriesController.getAll(req, res));
router.get('/:id', (req, res) => productCategoriesController.getById(req, res));
router.post('/', (req, res) => productCategoriesController.create(req, res));
router.put('/:id', (req, res) => productCategoriesController.update(req, res));
router.delete('/:id', (req, res) => productCategoriesController.delete(req, res));

export default router;
