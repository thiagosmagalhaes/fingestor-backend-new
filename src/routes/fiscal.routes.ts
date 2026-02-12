import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import fiscalController from '../controllers/fiscal.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// ===== Configuração Fiscal =====
router.get('/config', (req, res) => fiscalController.getConfig(req, res));
router.post('/config', (req, res) => fiscalController.upsertConfig(req, res));

// ===== Estatísticas =====
router.get('/stats', (req, res) => fiscalController.getStats(req, res));

// ===== Documentos Fiscais =====
router.get('/documents', (req, res) => fiscalController.listDocuments(req, res));
router.get('/documents/:id', (req, res) => fiscalController.getDocument(req, res));
router.post('/documents', (req, res) => fiscalController.createDocument(req, res));
router.patch('/documents/:id/status', (req, res) => fiscalController.updateDocumentStatus(req, res));
router.post('/documents/:id/emit', (req, res) => fiscalController.emitDocument(req, res));
router.post('/documents/:id/consult', (req, res) => fiscalController.consultDocument(req, res));
router.post('/documents/:id/cancel', (req, res) => fiscalController.cancelDocument(req, res));
router.post('/documents/:id/correct', (req, res) => fiscalController.correctDocument(req, res));
router.get('/documents/:id/events', (req, res) => fiscalController.getDocumentEvents(req, res));
router.get('/documents/:id/pdf', (req, res) => fiscalController.getDocumentPdf(req, res));
router.get('/documents/:id/xml', (req, res) => fiscalController.getDocumentXml(req, res));

export default router;
