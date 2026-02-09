import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import followupController from '../controllers/followup.controller';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de followup_tasks
router.get('/tasks', (req, res) => followupController.getTasks(req, res));
router.get('/tasks/:id', (req, res) => followupController.getTaskById(req, res));
router.post('/tasks', (req, res) => followupController.createTask(req, res));
router.put('/tasks/:id', (req, res) => followupController.updateTask(req, res));
router.delete('/tasks/:id', (req, res) => followupController.deleteTask(req, res));

export default router;
