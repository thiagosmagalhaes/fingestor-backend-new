import { Request, Response } from "express";
import supabase, { getSupabaseClient, supabaseAdmin } from "../config/database";
import { EmailService } from "../services/email.service";
import { encryptUserIdWithIV } from "../utils/crypto.utils";
import { AuthRequest } from "../middleware/auth";

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
          error: "Email e senha são obrigatórios",
        });
      }

      // Validação de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "Email inválido",
        });
      }

      // Realizar login com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);

        // Tratar erros específicos do Supabase
        if (error.message.includes("Invalid login credentials")) {
          return res.status(401).json({
            error: "Email ou senha inválidos",
          });
        }

        if (error.message.includes("Email not confirmed")) {
          return res.status(401).json({
            error: "Email não confirmado. Verifique sua caixa de entrada.",
          });
        }

        return res.status(401).json({
          error: error.message || "Erro ao realizar login",
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
      console.error("Error in login:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  /**
   * POST /api/auth/register
   * Registra novo usuário usando Supabase Auth
   */
  async register(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email, password, confirmPassword, fullName, phone } =
        req.body as RegisterRequest;

      // Validação de campos obrigatórios
      if (!email || !password || !confirmPassword || !fullName || !phone) {
        return res.status(400).json({
          error: "Todos os campos são obrigatórios",
        });
      }

      // Validação de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "Email inválido",
        });
      }

      // Validação de senhas
      if (password !== confirmPassword) {
        return res.status(400).json({
          error: "As senhas não coincidem",
        });
      }

      // Validação de força da senha
      if (password.length < 6) {
        return res.status(400).json({
          error: "A senha deve ter pelo menos 6 caracteres",
        });
      }

      // Validação de nome completo
      if (fullName.trim().length < 3) {
        return res.status(400).json({
          error: "Nome completo deve ter pelo menos 3 caracteres",
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
            phone: phone.replace(/\D/g, ""),
          },
        },
      });

      if (error) {
        console.error("Registration error:", error);

        // Tratar erros específicos do Supabase
        if (error.message.includes("User already registered")) {
          return res.status(409).json({
            error: "Email já cadastrado",
          });
        }

        if (error.message.includes("Password should be at least")) {
          return res.status(400).json({
            error: "A senha não atende aos requisitos mínimos",
          });
        }

        return res.status(400).json({
          error: error.message || "Erro ao realizar cadastro",
        });
      }

      // Verificar se o email precisa ser confirmado
      const needsEmailConfirmation = !data.session;

      // Enviar newsletter de boas-vindas (não bloqueia o cadastro)
      if (data.user?.email) {
        const emailService = new EmailService();
        const unsubscribeToken = encryptUserIdWithIV(data.user.id);

        emailService
          .sendWelcomeNewsletter(data.user.email, fullName, unsubscribeToken)
          .catch((error) => {
            console.error("Erro ao enviar newsletter de boas-vindas:", error);
            // Não falha o cadastro se o email falhar
          });
      }

      if (needsEmailConfirmation) {
        return res.status(201).json({
          message:
            "Cadastro realizado com sucesso! Verifique seu email para confirmar sua conta.",
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
        message: "Cadastro realizado com sucesso!",
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
      console.error("Error in register:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  /**
   * POST /api/auth/logout
   * Realiza logout do usuário
   */
  async logout(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const token = req.accessToken!;

      // Realizar logout no Supabase
      const { error } = await supabase.auth.admin.signOut(token);

      if (error) {
        console.error("Logout error:", error);
        return res.status(400).json({
          error: "Erro ao realizar logout",
        });
      }

      res.json({
        message: "Logout realizado com sucesso",
      });
    } catch (error) {
      console.error("Error in logout:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
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
          error: "Refresh token é obrigatório",
        });
      }

      // Renovar sessão
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        console.error("Refresh token error:", error);
        return res.status(401).json({
          error: "Refresh token inválido ou expirado",
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
      console.error("Error in refresh:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  /**
   * GET /api/auth/me
   * Retorna dados do usuário autenticado
   */
  async me(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const supabase = getSupabaseClient(req.accessToken!);

      const { data: user, error } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, phone, created_at, metadata")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Get user error:", error);
        return res.status(401).json({
          error: "Token inválido ou expirado",
        });
      }

      if (!user) {
        return res.status(401).json({
          error: "Usuário não encontrado",
        });
      }

      res.json({
        user: {
          id: user.user_id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      console.error("Error in me:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  /**
   * PUT /api/auth/profile
   * Atualiza dados do usuário autenticado
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const supabase = getSupabaseClient(req.accessToken!);

      const { fullName, email, phone } = req.body;

      // Validar se pelo menos um campo foi enviado
      if (!fullName && !email && !phone) {
        return res.status(400).json({
          error: "Pelo menos um campo deve ser informado para atualização",
        });
      }

      // Validar email se fornecido
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            error: "Email inválido",
          });
        }
      }

      // Validar fullName se fornecido
      if (fullName && fullName.trim().length < 2) {
        return res.status(400).json({
          error: "Nome deve ter pelo menos 2 caracteres",
        });
      }

      // Validar phone se fornecido
      if (phone && phone.trim().length < 10) {
        return res.status(400).json({
          error: "Telefone inválido",
        });
      }

      // Obter usuário atual
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser(req.accessToken!);

      if (getUserError || !user) {
        return res.status(401).json({
          error: "Token inválido ou expirado",
        });
      }

      // Preparar dados para atualização
      const updateData: any = {};
      const metadataUpdates: any = {};

      if (email && email !== user.email) {
        updateData.email = email;
      }

      if (fullName) {
        metadataUpdates.full_name = fullName.trim();
      }

      if (phone) {
        metadataUpdates.phone = phone.trim();
      }

      // Atualizar metadata se houver
      if (Object.keys(metadataUpdates).length > 0) {
        updateData.data = {
          ...user.user_metadata,
          ...metadataUpdates,
        };
      }

      // Atualizar usuário no Supabase Auth usando admin API
      const { data: updatedAuthUser, error: updateAuthError } =
        await supabaseAdmin.auth.admin.updateUserById(user.id, updateData);

      if (updateAuthError) {
        console.error("Update auth user error:", updateAuthError);

        if (updateAuthError.message.includes("email already exists")) {
          return res.status(400).json({
            error: "Este email já está em uso",
          });
        }

        return res.status(400).json({
          error: updateAuthError.message || "Erro ao atualizar usuário",
        });
      }

      // Atualizar tabela profiles se fullName, email ou phone foram alterados
      if (fullName || email || phone) {
        const profileUpdates: any = {
          updated_at: new Date().toISOString(),
        };

        if (fullName) {
          profileUpdates.full_name = fullName.trim();
        }

        if (email) {
          profileUpdates.email = email;
        }

        if (phone) {
          profileUpdates.phone = phone.replace(/\D/g, "");
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("user_id", user.id);

        if (profileError) {
          console.error("Update profile error:", profileError);
          // Não falhar a requisição, apenas logar o erro
        }
      }

      res.json({
        message: "Perfil atualizado com sucesso",
        user: {
          id: updatedAuthUser.user.id,
          email: updatedAuthUser.user.email,
          fullName: updatedAuthUser.user.user_metadata?.full_name,
          phone: updatedAuthUser.user.user_metadata?.phone,
        },
      });
    } catch (error) {
      console.error("Error in updateProfile:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Envia email para recuperação de senha
   */
  async forgotPassword(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email } = req.body;

      // Validação de campo obrigatório
      if (!email) {
        return res.status(400).json({
          error: "Email é obrigatório",
        });
      }

      // Validação de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "Email inválido",
        });
      }

      // Enviar email de recuperação usando Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });

      if (error) {
        console.error("Forgot password error:", error);
        // Não revelar se o email existe ou não por segurança
        // Sempre retornar sucesso
      }

      // Sempre retornar sucesso para não revelar se o email existe
      res.json({
        message: "Se o email existir em nossa base, você receberá instruções para recuperação de senha",
      });
    } catch (error) {
      console.error("Error in forgotPassword:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Redefine a senha do usuário usando o token recebido por email
   */
  async resetPassword(req: Request, res: Response): Promise<Response | void> {
    try {
      const { password, confirmPassword } = req.body;

      // Validação de campos obrigatórios
      if (!password || !confirmPassword) {
        return res.status(400).json({
          error: "Senha e confirmação são obrigatórias",
        });
      }

      // Validar se as senhas coincidem
      if (password !== confirmPassword) {
        return res.status(400).json({
          error: "As senhas não coincidem",
        });
      }

      // Validar comprimento mínimo da senha
      if (password.length < 6) {
        return res.status(400).json({
          error: "A senha deve ter no mínimo 6 caracteres",
        });
      }

      // Obter o token do header de autorização
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: "Token de recuperação não fornecido",
        });
      }

      const token = authHeader.substring(7);

      // Verificar se o token é válido obtendo o usuário
      const { data: userData, error: userError } = await supabase.auth.getUser(token);

      if (userError || !userData.user) {
        return res.status(400).json({
          error: "Token de recuperação inválido ou expirado. Solicite um novo link.",
        });
      }

      // Atualizar senha usando Admin API
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userData.user.id,
        { password: password }
      );

      if (error) {
        console.error("Reset password error:", error);

        if (error.message.includes('expired') || error.message.includes('invalid')) {
          return res.status(400).json({
            error: "Token de recuperação inválido ou expirado. Solicite um novo link.",
          });
        }

        return res.status(400).json({
          error: error.message || "Erro ao redefinir senha",
        });
      }

      res.json({
        message: "Senha redefinida com sucesso",
      });
    } catch (error) {
      console.error("Error in resetPassword:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
}

export default new AuthController();
