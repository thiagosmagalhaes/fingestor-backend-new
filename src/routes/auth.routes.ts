import { Router } from 'express';
import authController from '../controllers/auth.controller';

const router = Router();

// Rotas públicas (não requerem autenticação)
router.post('/login', (req, res) => authController.login(req, res));
router.post('/register', (req, res) => authController.register(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));

// Rotas protegidas (requerem autenticação)
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', (req, res) => authController.me(req, res));

export default router;
