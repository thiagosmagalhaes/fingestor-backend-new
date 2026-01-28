import { Router } from 'express';
import { NewsletterController } from '../controllers/newsletter.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const newsletterController = new NewsletterController();

// Enviar newsletter customizada (requer autenticação)
router.post(
  '/send',
  authMiddleware,
  newsletterController.sendCustomNewsletter.bind(newsletterController)
);

// Enviar newsletter de boas-vindas (público para uso em signup)
router.post(
  '/welcome',
  newsletterController.sendWelcomeNewsletter.bind(newsletterController)
);

// Enviar newsletter de trial expirando
router.post(
  '/trial-expiring',
  newsletterController.sendTrialExpiringNewsletter.bind(newsletterController)
);

// Enviar newsletter de assinatura confirmada
router.post(
  '/subscription-confirmed',
  newsletterController.sendSubscriptionConfirmedNewsletter.bind(newsletterController)
);

// Enviar newsletter de atualizações (requer autenticação - admin)
router.post(
  '/updates',
  authMiddleware,
  newsletterController.sendUpdatesNewsletter.bind(newsletterController)
);

export default router;
