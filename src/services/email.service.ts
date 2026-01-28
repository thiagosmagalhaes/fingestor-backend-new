import { NewsletterData } from '../types/newsletter.types';
import { supabaseAdmin } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

interface ResendEmailResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

interface ResendErrorResponse {
  statusCode: number;
  message: string;
  name: string;
}

export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private newsletterTemplate: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'Fingestor <onboarding@resend.dev>';
    
    if (!this.apiKey) {
      console.warn('⚠️  RESEND_API_KEY não configurada. Emails não serão enviados.');
    }

    // Carregar template HTML
    try {
      const templatePath = path.join(__dirname, '../../templates/newsletter-layout.html');
      this.newsletterTemplate = fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      console.error('❌ Erro ao carregar template de newsletter:', error);
      this.newsletterTemplate = '';
    }
  }

  /**
   * Envia uma newsletter usando o template padrão
   */
  async sendNewsletter(
    to: string | string[],
    data: NewsletterData
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    try {
      if (!this.apiKey) {
        console.log('📧 [MODO DEV] Newsletter não enviada (sem API key):', {
          to,
          subject: data.emailSubject
        });
        return { success: true, messageId: 'dev-mode-skip' };
      }

      // Compilar template com dados
      const html = this.compileTemplate(this.newsletterTemplate, data);

      // Fazer requisição para Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: Array.isArray(to) ? to : [to],
          subject: data.emailSubject,
          html
        })
      });

      const result = await response.json();

      if (!response.ok) {
        const error = result as ResendErrorResponse;
        console.error('❌ Erro ao enviar email via Resend:', error);
        return { success: false, error };
      }

      const emailData = result as ResendEmailResponse;
      console.log('✅ Email enviado com sucesso:', emailData.id);
      
      return { success: true, messageId: emailData.id };
    } catch (error) {
      console.error('❌ Erro ao enviar newsletter:', error);
      return { success: false, error };
    }
  }

  /**
   * Envia newsletter de boas-vindas
   */
  async sendWelcomeNewsletter(
    email: string,
    userName: string,
    unsubscribeToken: string
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    return this.sendNewsletter(email, {
      emailSubject: 'Bem-vindo ao Fingestor! 🎉',
      title: `Bem-vindo ao Fingestor, ${userName}!`,
      subtitle: 'Estamos felizes em ter você conosco',
      content: 'Agora você tem acesso completo a todas as ferramentas de controle financeiro pensadas especialmente para MEI.',
      
      featuresTitle: 'O que você pode fazer no Fingestor:',
      features: [
        {
          title: 'Controle de caixa simples',
          description: 'Registre entradas e saídas em poucos cliques'
        },
        {
          title: 'DRE automático',
          description: 'Saiba seu lucro real sem precisar de contador'
        },
        {
          title: 'Dashboard completo',
          description: 'Visualize a saúde financeira da sua empresa'
        },
        {
          title: 'Gestão de cartões',
          description: 'Controle faturas e parcelas automaticamente'
        }
      ],
      
      ctaUrl: `${process.env.FRONTEND_URL}/dashboard`,
      ctaText: 'Acessar meu Dashboard',
      closingText: 'Bom trabalho e sucesso nos negócios!',
      unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`
    });
  }

  /**
   * Envia newsletter de trial expirando
   */
  async sendTrialExpiringNewsletter(
    email: string,
    userName: string,
    daysRemaining: number,
    unsubscribeToken: string
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    return this.sendNewsletter(email, {
      emailSubject: `Seu período de teste expira em ${daysRemaining} dias`,
      title: 'Seu período de teste está terminando',
      subtitle: 'Não perca o acesso ao controle financeiro da sua empresa',
      content: `Olá ${userName}, seu período de teste gratuito expira em ${daysRemaining} dias. Continue aproveitando todas as funcionalidades do Fingestor assinando um de nossos planos.`,
      
      warningBox: `Seu trial expira em ${daysRemaining} dias. Assine agora para não perder seus dados e continuar com o controle financeiro.`,
      
      ctaUrl: `${process.env.FRONTEND_URL}/pricing`,
      ctaText: 'Ver Planos e Preços',
      
      closingText: 'Qualquer dúvida, estamos à disposição!',
      unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`
    });
  }

  /**
   * Envia newsletter de assinatura confirmada
   */
  async sendSubscriptionConfirmedNewsletter(
    email: string,
    userName: string,
    planName: string,
    unsubscribeToken: string
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    return this.sendNewsletter(email, {
      emailSubject: 'Assinatura confirmada! ✅',
      title: 'Sua assinatura está ativa!',
      subtitle: `Plano ${planName} confirmado com sucesso`,
      content: `Olá ${userName}, sua assinatura do plano ${planName} foi confirmada e está ativa. Agora você tem acesso completo a todas as funcionalidades do Fingestor.`,
      
      successBox: 'Pagamento processado com sucesso! Sua assinatura foi ativada.',
      
      ctaUrl: `${process.env.FRONTEND_URL}/dashboard`,
      ctaText: 'Acessar Dashboard',
      
      closingText: 'Obrigado por assinar o Fingestor!',
      unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`
    });
  }

  /**
   * Envia newsletter com atualizações do sistema
   */
  async sendUpdatesNewsletter(
    emails: string[],
    updates: Array<{ title: string; description: string }>,
    unsubscribeToken: string
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    const currentMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());
    
    return this.sendNewsletter(emails, {
      emailSubject: `Novidades de ${currentMonth}`,
      title: `Novidades de ${currentMonth}`,
      subtitle: 'Confira as melhorias que fizemos para você',
      content: 'Este mês trouxemos várias melhorias baseadas no feedback dos nossos usuários. Veja o que há de novo:',
      
      featuresTitle: 'O que há de novo:',
      features: updates,
      
      ctaUrl: `${process.env.FRONTEND_URL}/changelog`,
      ctaText: 'Ver todas as novidades',
      
      closingText: 'Obrigado por usar o Fingestor!',
      unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`
    });
  }

  /**
   * Compila template Handlebars com dados
   */
  private compileTemplate(template: string, data: any): string {
    let compiled = template;

    // Substituir variáveis simples {{variable}}
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        compiled = compiled.replace(regex, data[key]);
      }
    });

    // Processar condicionais {{#if variable}}...{{/if}}
    const ifRegex = /{{#if (\w+)}}([\s\S]*?){{\/if}}/g;
    compiled = compiled.replace(ifRegex, (_match, variable, content) => {
      return data[variable] ? content : '';
    });

    // Processar loops {{#each array}}...{{/each}}
    const eachRegex = /{{#each (\w+)}}([\s\S]*?){{\/each}}/g;
    compiled = compiled.replace(eachRegex, (_match, variable, content) => {
      if (!Array.isArray(data[variable])) return '';
      
      return data[variable].map((item: any) => {
        let itemContent = content;
        // Substituir {{this.property}}
        Object.keys(item).forEach(prop => {
          const regex = new RegExp(`{{this\\.${prop}}}`, 'g');
          itemContent = itemContent.replace(regex, item[prop]);
        });
        return itemContent;
      }).join('');
    });

    return compiled;
  }

  /**
   * Verifica se já enviou newsletter recentemente
   */
  async hasRecentNewsletter(
    userId: string,
    type: string,
    hoursAgo: number = 24
  ): Promise<boolean> {
    try {
      const timeAgo = new Date();
      timeAgo.setHours(timeAgo.getHours() - hoursAgo);

      const { data } = await supabaseAdmin
        .from('newsletter_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('newsletter_type', type)
        .gte('sent_at', timeAgo.toISOString())
        .limit(1)
        .single();

      return !!data;
    } catch (error) {
      // Se não encontrar, retorna false (não enviou recentemente)
      return false;
    }
  }
}
