import { Router } from 'express';
import notificationsController from '../controllers/notifications.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Buscar todas as notificações
router.get('/', (req, res) => notificationsController.getNotifications(req, res));

// Buscar contagem de não lidas
router.get('/unread-count/:companyId', (req, res) => notificationsController.getUnreadCount(req, res));

// Marcar como lida
router.patch('/:id/read', (req, res) => notificationsController.markAsRead(req, res));

// Marcar todas como lidas
router.patch('/read-all/:companyId', (req, res) => notificationsController.markAllAsRead(req, res));

// Deletar notificação
router.delete('/:id', (req, res) => notificationsController.deleteNotification(req, res));

// Criar notificação
router.post('/', (req, res) => notificationsController.createNotification(req, res));

export default router;
