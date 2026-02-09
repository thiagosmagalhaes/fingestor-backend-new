import { Router } from 'express';
import cashSessionsController from '../controllers/cash-sessions.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

/**
 * GET /api/cash-sessions/current?companyId=xxx
 * Obtém a sessão de caixa aberta atual
 */
router.get('/current', cashSessionsController.getCurrent.bind(cashSessionsController));

/**
 * GET /api/cash-sessions/:id?companyId=xxx
 * Obtém relatório completo de uma sessão de caixa específica
 */
router.get('/:id', cashSessionsController.getById.bind(cashSessionsController));

/**
 * GET /api/cash-sessions?companyId=xxx&limit=50&offset=0&from=yyyy-mm-dd&to=yyyy-mm-dd
 * Lista histórico de sessões de caixa
 */
router.get('/', cashSessionsController.getAll.bind(cashSessionsController));

/**
 * POST /api/cash-sessions/open
 * Abre uma nova sessão de caixa
 */
router.post('/open', cashSessionsController.open.bind(cashSessionsController));

/**
 * POST /api/cash-sessions/close
 * Fecha a sessão de caixa atual
 */
router.post('/close', cashSessionsController.close.bind(cashSessionsController));

export default router;
