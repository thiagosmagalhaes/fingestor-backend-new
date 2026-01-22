import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import dashboardController from '../controllers/dashboard.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rota principal que retorna todos os dados do dashboard de uma vez
router.get('/all', (req, res) => dashboardController.getAllDashboardData(req, res));

// Rota de status de setup inicial (onboarding)
router.get('/setup-status/:companyId', (req, res) => dashboardController.getSetupStatus(req, res));

// Rota do DRE (Demonstrativo de Resultados do Exercício)
router.get('/dre', (req, res) => dashboardController.getDRE(req, res));

// Rota para buscar período de transações (primeira e última)
router.get('/transaction-date-range', (req, res) => dashboardController.getTransactionDateRange(req, res));

// Rotas individuais
router.get('/summary', (req, res) => dashboardController.getSummary(req, res));
router.get('/overdue', (req, res) => dashboardController.getOverdue(req, res));
router.get('/cash-flow', (req, res) => dashboardController.getCashFlow(req, res));
router.get('/category-breakdown', (req, res) => dashboardController.getCategoryBreakdown(req, res));
router.get('/recent-transactions', (req, res) => dashboardController.getRecentTransactions(req, res));
router.get('/credit-card-invoices', (req, res) => dashboardController.getCreditCardInvoices(req, res));

export default router;
