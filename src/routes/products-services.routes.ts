import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import productsServicesController from '../controllers/products-services.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de products_services
router.get('/', (req, res) => productsServicesController.getAll(req, res));
router.get('/search', (req, res) => productsServicesController.search(req, res));
router.get('/low-stock', (req, res) => productsServicesController.getLowStock(req, res));
router.get('/:id', (req, res) => productsServicesController.getById(req, res));
router.post('/', (req, res) => productsServicesController.create(req, res));
router.put('/:id', (req, res) => productsServicesController.update(req, res));
router.delete('/:id', (req, res) => productsServicesController.delete(req, res));

export default router;
