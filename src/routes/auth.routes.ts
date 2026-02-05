import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Rotas públicas (não requerem autenticação)
router.post('/login', (req, res) => authController.login(req, res));
router.post('/register', (req, res) => authController.register(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

// Rotas protegidas (requerem autenticação)
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));
router.get('/me', authMiddleware, (req, res) => authController.me(req, res));
router.put('/profile', authMiddleware, (req, res) => authController.updateProfile(req, res));

export default router;
