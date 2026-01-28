import { Request, Response } from 'express';
import supabase from '../config/database';
import { EmailService } from '../services/email.service';
import { encryptUserIdWithIV } from '../utils/crypto.utils';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
}

export class AuthController {
  /**
   * POST /api/auth/login
   * Realiza login do usuário usando Supabase Auth
   */
  async login(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email, password } = req.body as LoginRequest;

      // Validação de campos obrigatórios
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email e senha são obrigatórios' 
        });
      }

      // Validação de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: 'Email inválido' 
        });
      }

      // Realizar login com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        
        // Tratar erros específicos do Supabase
        if (error.message.includes('Invalid login credentials')) {
          return res.status(401).json({ 
            error: 'Email ou senha inválidos' 
          });
        }
        
        if (error.message.includes('Email not confirmed')) {
          return res.status(401).json({ 
            error: 'Email não confirmado. Verifique sua caixa de entrada.' 
          });
        }

        return res.status(401).json({ 
          error: error.message || 'Erro ao realizar login' 
        });
      }

      // Retornar dados do usuário e sessão
      res.json({
        user: {
          id: data.user?.id,
          email: data.user?.email,
          fullName: data.user?.user_metadata?.full_name,
        },
        session: {
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
          expiresIn: data.session?.expires_in,
          expiresAt: data.session?.expires_at,
        },
      });
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /api/auth/register
   * Registra novo usuário usando Supabase Auth
   */
  async register(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email, password, confirmPassword, fullName, phone } = req.body as RegisterRequest;

      // Validação de campos obrigatórios
      if (!email || !password || !confirmPassword || !fullName || !phone) {
        return res.status(400).json({ 
          error: 'Todos os campos são obrigatórios' 
        });
      }

      // Validação de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: 'Email inválido' 
        });
      }

      // Validação de senhas
      if (password !== confirmPassword) {
        return res.status(400).json({ 
          error: 'As senhas não coincidem' 
        });
      }

      // Validação de força da senha
      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'A senha deve ter pelo menos 6 caracteres' 
        });
      }

      // Validação de nome completo
      if (fullName.trim().length < 3) {
        return res.status(400).json({ 
          error: 'Nome completo deve ter pelo menos 3 caracteres' 
        });
      }

      // Registrar usuário no Supabase
      // adiciona o phone no supabase somente numeros
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.replace(/\D/g, ''),
          },
        },
      });

      if (error) {
        console.error('Registration error:', error);
        
        // Tratar erros específicos do Supabase
        if (error.message.includes('User already registered')) {
          return res.status(409).json({ 
            error: 'Email já cadastrado' 
          });
        }

        if (error.message.includes('Password should be at least')) {
          return res.status(400).json({ 
            error: 'A senha não atende aos requisitos mínimos' 
          });
        }

        return res.status(400).json({ 
          error: error.message || 'Erro ao realizar cadastro' 
        });
      }

      // Verificar se o email precisa ser confirmado
      const needsEmailConfirmation = !data.session;

      // Enviar newsletter de boas-vindas (não bloqueia o cadastro)
      if (data.user?.email) {
        const emailService = new EmailService();
        const unsubscribeToken = encryptUserIdWithIV(data.user.id);
        
        emailService.sendWelcomeNewsletter(
          data.user.email,
          fullName,
          unsubscribeToken
        ).catch(error => {
          console.error('Erro ao enviar newsletter de boas-vindas:', error);
          // Não falha o cadastro se o email falhar
        });
      }

      if (needsEmailConfirmation) {
        return res.status(201).json({
          message: 'Cadastro realizado com sucesso! Verifique seu email para confirmar sua conta.',
          user: {
            id: data.user?.id,
            email: data.user?.email,
            fullName: data.user?.user_metadata?.full_name,
          },
          emailConfirmationRequired: true,
        });
      }

      // Se não precisa confirmar email, retornar sessão
      res.status(201).json({
        message: 'Cadastro realizado com sucesso!',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          fullName: data.user?.user_metadata?.full_name,
        },
        session: {
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
          expiresIn: data.session?.expires_in,
          expiresAt: data.session?.expires_at,
        },
        emailConfirmationRequired: false,
      });
    } catch (error) {
      console.error('Error in register:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /api/auth/logout
   * Realiza logout do usuário
   */
  async logout(req: Request, res: Response): Promise<Response | void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Token não fornecido' 
        });
      }

      const token = authHeader.substring(7);

      // Realizar logout no Supabase
      const { error } = await supabase.auth.admin.signOut(token);

      if (error) {
        console.error('Logout error:', error);
        return res.status(400).json({ 
          error: 'Erro ao realizar logout' 
        });
      }

      res.json({ 
        message: 'Logout realizado com sucesso' 
      });
    } catch (error) {
      console.error('Error in logout:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /api/auth/refresh
   * Renova o token de acesso usando o refresh token
   */
  async refresh(req: Request, res: Response): Promise<Response | void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ 
          error: 'Refresh token é obrigatório' 
        });
      }

      // Renovar sessão
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Refresh token error:', error);
        return res.status(401).json({ 
          error: 'Refresh token inválido ou expirado' 
        });
      }

      res.json({
        session: {
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
          expiresIn: data.session?.expires_in,
          expiresAt: data.session?.expires_at,
        },
      });
    } catch (error) {
      console.error('Error in refresh:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * GET /api/auth/me
   * Retorna dados do usuário autenticado
   */
  async me(req: Request, res: Response): Promise<Response | void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Token não fornecido' 
        });
      }

      const token = authHeader.substring(7);

      // Obter usuário pelo token
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error) {
        console.error('Get user error:', error);
        return res.status(401).json({ 
          error: 'Token inválido ou expirado' 
        });
      }

      if (!user) {
        return res.status(401).json({ 
          error: 'Usuário não encontrado' 
        });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      console.error('Error in me:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default new AuthController();
