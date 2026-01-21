import { Router } from 'express';
import { 
  createCheckoutSession, 
  getSubscriptionStatus,
  cancelSubscription,
  reactivateSubscription
} from '../controllers/subscriptions.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route POST /api/subscriptions/checkout
 * @desc Criar sessão de checkout do Stripe
 * @access Private
 * @body { plan_type: 'mensal' | 'semestral' | 'anual' }
 * @returns { sessionId: string, url: string }
 */
router.post('/checkout', authMiddleware, createCheckoutSession);

/**
 * NOTA: A rota do webhook (/api/subscriptions/webhook) está registrada
 * diretamente no index.ts ANTES do express.json() para preservar o raw body
 * necessário para validação da assinatura do Stripe
 */

/**
 * @route GET /api/subscriptions/status
 * @desc Obter status da assinatura do usuário autenticado
 * @access Private
 * @returns Subscription object
 */
router.get('/status', authMiddleware, getSubscriptionStatus);

/**
 * @route POST /api/subscriptions/cancel
 * @desc Cancelar assinatura (no fim do período atual)
 * @access Private
 * @returns Success message
 */
router.post('/cancel', authMiddleware, cancelSubscription);

/**
 * @route POST /api/subscriptions/reactivate
 * @desc Reativar assinatura cancelada
 * @access Private
 * @returns Success message
 */
router.post('/reactivate', authMiddleware, reactivateSubscription);

export default router;
