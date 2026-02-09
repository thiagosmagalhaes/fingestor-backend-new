import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { PaymentMethodsController } from '../controllers/payment-methods.controller';

const router = Router();
const paymentMethodsController = new PaymentMethodsController();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de formas de pagamento
router.get('/', (req, res) => paymentMethodsController.getAll(req, res));
router.get('/:id', (req, res) => paymentMethodsController.getById(req, res));
router.post('/', (req, res) => paymentMethodsController.create(req, res));
router.post('/calculate-fee', (req, res) => paymentMethodsController.calculateFee(req, res));
router.put('/:id', (req, res) => paymentMethodsController.update(req, res));
router.delete('/:id', (req, res) => paymentMethodsController.delete(req, res));

export default router;
