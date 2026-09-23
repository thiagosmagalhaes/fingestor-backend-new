import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import controller from '../controllers/api-keys.controller';
const router = Router();
router.use(authMiddleware);
router.get('/companies/:companyId', (req, res) => controller.list(req, res));
router.post('/companies/:companyId', (req, res) => controller.create(req, res));
router.delete('/companies/:companyId/:id', (req, res) => controller.revoke(req, res));
export default router;
