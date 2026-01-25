import { Router } from 'express';
import {
    createIdea,
    getIdeas,
    getIdeaById,
    voteIdea,
    removeVote,
    updateIdeaStatus,
    updateIdea,
    deleteIdea
} from '../controllers/ideas.controller';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Response, NextFunction } from 'express';

const router = Router();

// Middleware to check if user is admin
const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    return next();
};

// Public routes (require authentication)
router.post('/', authMiddleware, createIdea);
router.get('/', authMiddleware, getIdeas);
router.get('/:id', authMiddleware, getIdeaById);
router.put('/:id', authMiddleware, updateIdea);
router.delete('/:id', authMiddleware, deleteIdea);

// Voting routes
router.post('/:id/vote', authMiddleware, voteIdea);
router.delete('/:id/vote', authMiddleware, removeVote);

// Admin only routes
router.patch('/:id/status', authMiddleware, adminOnly, updateIdeaStatus);

export default router;
