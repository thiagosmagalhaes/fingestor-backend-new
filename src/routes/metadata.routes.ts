import { Router } from 'express';
import metadataController from '../controllers/metadata.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Todas as rotas de metadata requerem autenticação
router.use(authMiddleware);

// GET /api/metadata - Retorna todo o metadata do usuário
router.get('/', (req, res) => metadataController.getMetadata(req, res));

// PUT /api/metadata - Atualiza ou insere valor(es) no metadata
// Body (single): { path: string, value: any }
// Body (batch): { updates: [{ path: string, value: any }, ...] }
router.put('/', (req, res) => metadataController.updateMetadata(req, res));

// DELETE /api/metadata/:path - Remove campo específico do metadata
// Exemplo: DELETE /api/metadata/settings.theme
router.delete('/:path(*)', (req, res) => metadataController.deleteMetadata(req, res));

export default router;
