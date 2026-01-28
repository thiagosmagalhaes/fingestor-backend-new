import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';
import { SendNewsletterRequest } from '../types/newsletter.types';
import { isUserAdmin } from '../middleware/adminAuth';
import { AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

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

      const data: SendNewsletterRequest = req.body;

      // Validar campos obrigatórios
      if (!data.to || !data.subject || !data.title || !data.subtitle || !data.content) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: to, subject, title, subtitle, content' 
        });
      }

      // Gerar token de descadastro (em produção, usar sistema mais robusto)
      const unsubscribeToken = this.generateUnsubscribeToken(
        Array.isArray(data.to) ? data.to[0] : data.to
      );

      const result = await this.emailService.sendNewsletter(data.to, {
        emailSubject: data.subject,
        title: data.title,
        subtitle: data.subtitle,
        content: data.content,
        additionalContent: data.additionalContent,
        infoBox: data.infoBox,
        successBox: data.successBox,
        warningBox: data.warningBox,
        featuresTitle: data.featuresTitle,
        features: data.features,
        ctaUrl: data.ctaUrl,
        ctaText: data.ctaText,
        closingText: data.closingText,
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

      const unsubscribeToken = this.generateUnsubscribeToken(email);
      
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

      const unsubscribeToken = this.generateUnsubscribeToken(email);
      
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

      const unsubscribeToken = this.generateUnsubscribeToken(email);
      
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
      const userId = (req as any).user?.id;
      if (!userId) {
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

      const unsubscribeToken = this.generateUnsubscribeToken(emails[0]);
      
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
   * Gera token de descadastro (simplificado - em produção usar algo mais seguro)
   */
  private generateUnsubscribeToken(email: string): string {
    return crypto
      .createHash('sha256')
      .update(`${email}:${process.env.JWT_SECRET || 'secret'}`)
      .digest('hex');
  }
}
