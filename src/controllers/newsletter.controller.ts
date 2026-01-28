import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';
import { isUserAdmin } from '../middleware/adminAuth';
import { AuthRequest } from '../middleware/auth';
import { encryptUserIdWithIV } from '../utils/crypto.utils';
import { processNewsletterTags } from '../utils/newsletter-tags.utils';
import { supabaseAdmin } from '../config/database';

export class NewsletterController {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * POST /api/newsletter/send
   * Envia uma newsletter customizada
   */
  async sendCustomNewsletter(req: Request, res: Response): Promise<Response> {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const accessToken = authReq.accessToken;

      if (!userId || !accessToken) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      // Verificar se o usuario e admin
      const isAdmin = await isUserAdmin(accessToken, userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          error: 'Acesso negado. Apenas administradores podem enviar newsletters customizadas.' 
        });
      }

      const { to, subject, htmlBody } = req.body;

      // Validar campos obrigatórios
      if (!to || !subject || !htmlBody) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: to, subject, htmlBody' 
        });
      }

      // Processar tags personalizadas no HTML
      const processedHtml = processNewsletterTags(htmlBody);

      // Buscar userId do primeiro email para gerar token
      const email = Array.isArray(to) ? to[0] : to;
      const userIdForToken = await this.getUserIdFromEmail(email);
      
      if (!userIdForToken) {
        return res.status(404).json({
          error: 'Usuario nao encontrado para gerar token de unsubscribe'
        });
      }

      const unsubscribeToken = this.generateUnsubscribeToken(userIdForToken);

      const result = await this.emailService.sendNewsletter(to, {
        emailSubject: subject,
        title: '',
        subtitle: '',
        content: processedHtml,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`
      });

      if (!result.success) {
        return res.status(500).json({ 
          error: 'Erro ao enviar newsletter',
          details: result.error 
        });
      }

      return res.json({ 
        success: true,
        messageId: result.messageId,
        message: 'Newsletter enviada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao enviar newsletter:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /api/newsletter/welcome
   * Envia newsletter de boas-vindas para um usuário
   */
  async sendWelcomeNewsletter(req: Request, res: Response): Promise<Response> {
    try {
      const { email, name } = req.body;

      if (!email || !name) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: email, name' 
        });
      }

      // Buscar user_id a partir do email
      const userId = await this.getUserIdFromEmail(email);
      if (!userId) {
        return res.status(404).json({
          error: 'Usuario nao encontrado'
        });
      }

      const unsubscribeToken = this.generateUnsubscribeToken(userId);
      
      const result = await this.emailService.sendWelcomeNewsletter(
        email,
        name,
        unsubscribeToken
      );

      if (!result.success) {
        return res.status(500).json({ 
          error: 'Erro ao enviar newsletter de boas-vindas',
          details: result.error 
        });
      }

      return res.json({ 
        success: true,
        messageId: result.messageId,
        message: 'Newsletter de boas-vindas enviada'
      });
    } catch (error) {
      console.error('Erro ao enviar newsletter de boas-vindas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /api/newsletter/trial-expiring
   * Envia newsletter de trial expirando
   */
  async sendTrialExpiringNewsletter(req: Request, res: Response): Promise<Response> {
    try {
      const { email, name, daysRemaining } = req.body;

      if (!email || !name || daysRemaining === undefined) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: email, name, daysRemaining' 
        });
      }

      // Buscar user_id a partir do email
      const userId = await this.getUserIdFromEmail(email);
      if (!userId) {
        return res.status(404).json({
          error: 'Usuario nao encontrado'
        });
      }

      const unsubscribeToken = this.generateUnsubscribeToken(userId);
      
      const result = await this.emailService.sendTrialExpiringNewsletter(
        email,
        name,
        daysRemaining,
        unsubscribeToken
      );

      if (!result.success) {
        return res.status(500).json({ 
          error: 'Erro ao enviar newsletter',
          details: result.error 
        });
      }

      return res.json({ 
        success: true,
        messageId: result.messageId,
        message: 'Newsletter de trial expirando enviada'
      });
    } catch (error) {
      console.error('Erro ao enviar newsletter:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /api/newsletter/subscription-confirmed
   * Envia newsletter de assinatura confirmada
   */
  async sendSubscriptionConfirmedNewsletter(req: Request, res: Response): Promise<Response> {
    try {
      const { email, name, planName } = req.body;

      if (!email || !name || !planName) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: email, name, planName' 
        });
      }

      // Buscar user_id a partir do email
      const userId = await this.getUserIdFromEmail(email);
      if (!userId) {
        return res.status(404).json({
          error: 'Usuario nao encontrado'
        });
      }

      const unsubscribeToken = this.generateUnsubscribeToken(userId);
      
      const result = await this.emailService.sendSubscriptionConfirmedNewsletter(
        email,
        name,
        planName,
        unsubscribeToken
      );

      if (!result.success) {
        return res.status(500).json({ 
          error: 'Erro ao enviar newsletter',
          details: result.error 
        });
      }

      return res.json({ 
        success: true,
        messageId: result.messageId,
        message: 'Newsletter de assinatura confirmada enviada'
      });
    } catch (error) {
      console.error('Erro ao enviar newsletter:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /api/newsletter/updates
   * Envia newsletter com atualizações para múltiplos usuários
   */
  async sendUpdatesNewsletter(req: Request, res: Response): Promise<Response> {
    try {
      const requestUserId = (req as any).user?.id;
      if (!requestUserId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const { emails, updates } = req.body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ 
          error: 'Campo emails deve ser um array não vazio' 
        });
      }

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ 
          error: 'Campo updates deve ser um array não vazio com {title, description}' 
        });
      }

      // Buscar user_id do primeiro email (assumindo mesmo unsubscribe para todos)
      const userId = await this.getUserIdFromEmail(emails[0]);
      if (!userId) {
        return res.status(404).json({
          error: 'Usuario nao encontrado para o primeiro email'
        });
      }

      const unsubscribeToken = this.generateUnsubscribeToken(userId);
      
      const result = await this.emailService.sendUpdatesNewsletter(
        emails,
        updates,
        unsubscribeToken
      );

      if (!result.success) {
        return res.status(500).json({ 
          error: 'Erro ao enviar newsletter de atualizações',
          details: result.error 
        });
      }

      return res.json({ 
        success: true,
        messageId: result.messageId,
        message: 'Newsletter de atualizações enviada',
        recipientsCount: emails.length
      });
    } catch (error) {
      console.error('Erro ao enviar newsletter de atualizações:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Gera token de descadastro criptografando o user_id
   */
  private generateUnsubscribeToken(userId: string): string {
    return encryptUserIdWithIV(userId);
  }

  /**
   * Busca user_id a partir do email
   */
  private async getUserIdFromEmail(email: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return data.user_id;
  }
}
