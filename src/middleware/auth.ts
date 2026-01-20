import { Request, Response, NextFunction } from 'express';
import supabase from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  accessToken?: string; // Token JWT para usar nas queries do Supabase
}

/**
 * Middleware de autenticação usando Supabase
 * Verifica o token JWT no header Authorization
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token de autenticação não fornecido',
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido ou expirado',
      });
    }

    // Adicionar usuário e token ao request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    req.accessToken = token; // Salvar token para usar nas queries

    next();
  } catch (error) {
    console.error('Error in authMiddleware:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Erro ao validar autenticação',
    });
  }
};
