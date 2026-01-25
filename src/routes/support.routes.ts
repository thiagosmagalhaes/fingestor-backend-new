import { Router } from 'express';
import {
    createTicket,
    getTickets,
    getTicketById,
    getTicketMessages,
    createMessage,
    updateTicketStatus
} from '../controllers/support.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.post('/', authMiddleware, createTicket);
router.get('/', authMiddleware, getTickets);
router.get('/:id', authMiddleware, getTicketById);
router.get('/:id/messages', authMiddleware, getTicketMessages);
router.post('/:id/messages', authMiddleware, createMessage);
router.patch('/:id/status', authMiddleware, updateTicketStatus);

export default router;
