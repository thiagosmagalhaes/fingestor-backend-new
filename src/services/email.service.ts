import { NewsletterData, DailySummaryData } from '../types/newsletter.types';
import { supabaseAdmin } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

interface ResendEmailResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private newsletterTemplate: string;
  private dailySummaryTemplate: string;
  private supportTemplate: string;
  private portalAccessTemplate: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'Fingestor <onboarding@resend.dev>';
    
    if (!this.apiKey) {
      console.warn('⚠️  RESEND_API_KEY não configurada. Emails não serão enviados.');
    }

    // Carregar template HTML de newsletter
    try {
      const templatePath = path.join(__dirname, '../../templates/newsletter-layout.html');
      this.newsletterTemplate = fs.readFileSync(templatePath, 'utf-8');
      this.newsletterTemplate = this.newsletterTemplate.replace(/{{year}}/g, new Date().getFullYear().toString());
    } catch (error) {
      console.error('❌ Erro ao carregar template de newsletter:', error);
      this.newsletterTemplate = '';
    }

    // Carregar template HTML de resumo diário
    try {
      const templatePath = path.join(__dirname, '../../templates/daily-summary-layout.html');
      this.dailySummaryTemplate = fs.readFileSync(templatePath, 'utf-8');
      this.dailySummaryTemplate = this.dailySummaryTemplate.replace(/{{year}}/g, new Date().getFullYear().toString());
    } catch (error) {
      console.error('❌ Erro ao carregar template de resumo diário:', error);
      this.dailySummaryTemplate = '';
    }

    // Carregar template HTML de suporte
    try {
      const templatePath = path.join(__dirname, '../../templates/support.html');
      this.supportTemplate = fs.readFileSync(templatePath, 'utf-8');
      this.supportTemplate = this.supportTemplate.replace(/{{year}}/g, new Date().getFullYear().toString());
    } catch (error) {
      console.error('❌ Erro ao carregar template de suporte:', error);
      this.supportTemplate = '';
    }

    // Carregar template HTML de acesso ao portal do colaborador
    try {
      const templatePath = path.join(__dirname, '../../templates/hr-portal-access-layout.html');
      this.portalAccessTemplate = fs.readFileSync(templatePath, 'utf-8');
      this.portalAccessTemplate = this.portalAccessTemplate.replace(/{{year}}/g, new Date().getFullYear().toString());
    } catch (error) {
      console.error('❌ Erro ao carregar template de acesso ao portal:', error);
      this.portalAccessTemplate = '';
    }
  }

  /**
   * Envia múltiplas newsletters em batch (até 100 por vez)
   */
  async sendNewsletterBatch(
    emails: Array<{ to: string; data: NewsletterData }>
  ): Promise<{ success: boolean; messageIds?: string[]; error?: any }> {
    try {
      if (!this.apiKey) {
        console.log('📧 [MODO DEV] Newsletter batch não enviada (sem API key):', {
          count: emails.length
        });
        return { success: true, messageIds: emails.map(() => 'dev-mode-skip') };
      }

      // Preparar batch de emails
      const batch = emails.map(({ to, data }) => {
        const html = this.compileTemplate(this.newsletterTemplate, data);
        return {
          from: this.fromEmail,
          to: [to],
          subject: data.emailSubject,
          html
        };
      });

      // Enviar batch com retry
      const result = await this.sendBatchWithRetry(batch);

      if (!result.success) {
        console.error('❌ Erro ao enviar batch via Resend:', result.error);
        return { success: false, error: result.error };
      }

      console.log(`✅ Batch enviado com sucesso: ${result.messageIds?.length} emails`);
      
      return { success: true, messageIds: result.messageIds };
    } catch (error) {
      console.error('❌ Erro ao enviar newsletter batch:', error);
      return { success: false, error };
    }
  }

  /**
   * Envia batch com retry e exponential backoff
   */
  private async sendBatchWithRetry(
    batch: Array<{ from: string; to: string[]; subject: string; html: string }>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<{ success: boolean; messageIds?: string[]; error?: any }> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batch)
        });

        const result = await response.json() as any;

        // Se sucesso, retornar IDs
        if (response.ok) {
          const messageIds = result.data.map((item: any) => item.id);
          return { success: true, messageIds };
        }

        // Se rate limit (429), fazer retry com backoff
        if (response.status === 429) {
          if (attempt < retries - 1) {
            const backoffDelay = delay * Math.pow(2, attempt);
            console.log(`⏳ Rate limit atingido no batch. Aguardando ${backoffDelay}ms... (tentativa ${attempt + 1}/${retries})`);
            await this.sleep(backoffDelay);
            continue;
          }
        }

        // Se outro erro, retornar
        return { success: false, error: result };
      } catch (error) {
        if (attempt < retries - 1) {
          await this.sleep(delay * Math.pow(2, attempt));
          continue;
        }
        return { success: false, error };
      }
    }

    return { success: false, error: 'Max retries atingido no batch' };
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

      // Fazer requisição para Resend API com retry e exponential backoff
      const result = await this.sendWithRetry({
        from: this.fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject: data.emailSubject,
        html
      });

      if (!result.success) {
        console.error('❌ Erro ao enviar email via Resend:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Email enviado com sucesso:', result.messageId);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar newsletter:', error);
      return { success: false, error };
    }
  }

  /**
   * Envia email com retry e exponential backoff para rate limiting
   */
  private async sendWithRetry(
    emailData: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text?: string;
    },
    retries: number = 3,
    delay: number = 1000
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        });

        const result = await response.json();

        // Se sucesso, retornar imediatamente
        if (response.ok) {
          const emailResponse = result as ResendEmailResponse;
          return { success: true, messageId: emailResponse.id };
        }

        // Se rate limit (429), fazer retry com backoff
        if (response.status === 429) {
          if (attempt < retries - 1) {
            const backoffDelay = delay * Math.pow(2, attempt); // Exponential backoff
            console.log(`⏳ Rate limit atingido. Aguardando ${backoffDelay}ms antes de tentar novamente... (tentativa ${attempt + 1}/${retries})`);
            await this.sleep(backoffDelay);
            continue;
          }
        }

        // Se outro erro, retornar
        return { success: false, error: result };
      } catch (error) {
        if (attempt < retries - 1) {
          await this.sleep(delay * Math.pow(2, attempt));
          continue;
        }
        return { success: false, error };
      }
    }

    return { success: false, error: 'Max retries atingido' };
  }

  /**
   * Sleep helper para exponential backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Envia email com credenciais de acesso ao portal do colaborador.
   */
  async sendEmployeePortalAccessEmail(params: {
    to: string;
    employeeName: string;
    companyName: string;
    portalUrl: string;
    loginEmail: string;
    temporaryPassword: string;
  }): Promise<{ success: boolean; messageId?: string; error?: any }> {
    try {
      const {
        to,
        employeeName,
        companyName,
        portalUrl,
        loginEmail,
        temporaryPassword,
      } = params;

      if (!this.apiKey) {
        console.log('📧 [MODO DEV] Email de acesso ao portal não enviado (sem API key):', {
          to,
          companyName,
        });
        return { success: true, messageId: 'dev-mode-skip' };
      }

      const safeEmployeeName = this.escapeHtml(employeeName || 'Colaborador');
      const safeCompanyName = this.escapeHtml(companyName || 'sua empresa');
      const safePortalUrl = this.escapeHtml(portalUrl);
      const safeLoginEmail = this.escapeHtml(loginEmail);
      const safeTemporaryPassword = this.escapeHtml(temporaryPassword);

      const subject = `Acesso ao portal liberado - ${companyName}`;

      const htmlTemplate = this.portalAccessTemplate || `
        <html>
          <body style="font-family:Arial,Helvetica,sans-serif;color:#111827;">
            <h2>Acesso ao portal liberado</h2>
            <p>Ola {{employeeName}},</p>
            <p>Seu acesso ao portal do colaborador da empresa <strong>{{companyName}}</strong> foi criado.</p>
            <p><strong>URL:</strong> <a href="{{portalUrl}}">{{portalUrl}}</a></p>
            <p><strong>Login:</strong> {{loginEmail}}</p>
            <p><strong>Senha temporaria:</strong> {{temporaryPassword}}</p>
            <p>Por seguranca, altere sua senha apos o primeiro login.</p>
          </body>
        </html>
      `;

      const html = htmlTemplate
        .replace(/{{employeeName}}/g, safeEmployeeName)
        .replace(/{{companyName}}/g, safeCompanyName)
        .replace(/{{portalUrl}}/g, safePortalUrl)
        .replace(/{{loginEmail}}/g, safeLoginEmail)
        .replace(/{{temporaryPassword}}/g, safeTemporaryPassword);

      const text = [
        `Ola ${employeeName},`,
        '',
        `Seu acesso ao portal de colaborador da empresa ${companyName} foi criado com sucesso.`,
        '',
        'Dados de acesso:',
        `URL: ${portalUrl}`,
        `Login: ${loginEmail}`,
        `Senha temporaria: ${temporaryPassword}`,
        '',
        'Por seguranca, altere sua senha apos o primeiro login.',
      ].join('\n');

      const result = await this.sendWithRetry({
        from: this.fromEmail,
        to: [to],
        subject,
        html,
        text,
      });

      if (!result.success) {
        console.error('❌ Erro ao enviar email de acesso ao portal:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Email de acesso ao portal enviado:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar email de acesso ao portal:', error);
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
      content: 'Agora você tem acesso completo a todas as ferramentas de controle financeiro para organizar suas finanças.',
      
      featuresTitle: 'O que você pode fazer no Fingestor:',
      features: [
        {
          title: 'Controle de caixa simples',
          description: 'Registre entradas e saídas em poucos cliques'
        },
        {
          title: 'DRE automático',
          description: 'Saiba seu lucro real e acompanhe seus resultados'
        },
        {
          title: 'Dashboard completo',
          description: 'Visualize a saúde das suas finanças'
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
   * Envia email de alerta de onboarding/engajamento
   */
  async sendEngagementAlert(
    email: string,
    userName: string,
    messageKey: string,
    messageBody: string,
    unsubscribeToken: string
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    // Mapear message_key para subject apropriado
    const subjectMap: Record<string, string> = {
      welcome_10min: 'Bem-vindo ao Fingestor! 👋',
      create_account_24h: 'Vamos começar a organizar suas finanças?',
      first_tx_48h: 'Próximo passo: sua primeira transação',
      micro_win_72h: 'Um pequeno passo que faz diferença',
      value_5d: 'Descubra para onde seu dinheiro está indo',
      help_7d: 'Precisa de ajuda com o Fingestor?',
      comeback_inactive: 'Sentimos sua falta no Fingestor'
    };

    const subject = subjectMap[messageKey] || 'Mensagem do Fingestor';
    
    // Converter quebras de linha em parágrafos HTML
    const htmlContent = messageBody
      .split('\n\n')
      .map(p => `<p style="margin-bottom: 16px;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    return this.sendNewsletter(email, {
      emailSubject: subject,
      title: subject,
      subtitle: `Olá ${userName}!`,
      content: htmlContent,
      ctaUrl: `${process.env.FRONTEND_URL}/dashboard`,
      ctaText: 'Acessar Dashboard',
      closingText: 'Qualquer dúvida, estamos à disposição!',
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
      subtitle: 'Não perca o acesso ao seu controle financeiro',
      content: `Olá ${userName}, seu período de teste gratuito expira em ${daysRemaining} dias. Continue aproveitando todas as funcionalidades do Fingestor assinando um de nossos planos.`,
      
      warningBox: `Seu trial expira em ${daysRemaining} dias. Assine agora para não perder seus dados e continuar com o controle das suas finanças.`,
      
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

  /**
   * Envia email de resumo diário com transações vencendo organizadas por empresa
   */
  async sendDailySummary(
    to: string,
    data: DailySummaryData
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    try {
      if (!this.apiKey) {
        console.log('📧 [MODO DEV] Resumo diário não enviado (sem API key):', {
          to,
          subject: data.emailSubject
        });
        return { success: true, messageId: 'dev-mode-skip' };
      }

      // Compilar template com dados
      const html = this.compileDailySummaryTemplate(data);

      // Fazer requisição para Resend API com retry
      const result = await this.sendWithRetry({
        from: this.fromEmail,
        to: [to],
        subject: data.emailSubject,
        html
      });

      if (!result.success) {
        console.error('❌ Erro ao enviar resumo diário via Resend:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Resumo diário enviado com sucesso:', result.messageId);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar resumo diário:', error);
      return { success: false, error };
    }
  }

  /**
   * Compila o template de resumo diário
   */
  private compileDailySummaryTemplate(data: DailySummaryData): string {
    let html = this.dailySummaryTemplate;

    // Substituir variáveis simples
    html = html.replace(/{{userName}}/g, data.userName);
    html = html.replace(/{{emailSubject}}/g, data.emailSubject);
    html = html.replace(/{{totalReceivables}}/g, data.totalReceivables.toFixed(2));
    html = html.replace(/{{totalPayables}}/g, data.totalPayables.toFixed(2));
    html = html.replace(/{{unsubscribeUrl}}/g, data.unsubscribeUrl);

    // Construir HTML das empresas usando apenas tables (compatível com email)
    let companiesHtml = '';
    
    for (const company of data.companies) {
      if (company.receivables.length === 0 && company.payables.length === 0) {
        continue; // Pular empresas sem transações vencendo
      }

      companiesHtml += `
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;margin-bottom:20px;">
          <tr>
            <td style="padding:20px;">
              <h3 style="color:#111827;margin:0 0 16px;font-size:18px;">🏢 ${company.name}</h3>
              
              ${company.receivables.length > 0 ? `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${company.payables.length > 0 ? '16px' : '0'};">
                  <tr>
                    <td>
                      <h4 style="color:#27ae60;margin:0 0 12px;font-size:15px;">💰 Contas a Receber (R$ ${company.totalReceivables.toFixed(2)})</h4>
                    </td>
                  </tr>
                  ${company.receivables.map(tx => `
                    <tr>
                      <td style="border-bottom:1px solid #e5e7eb;padding:10px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align:top;">
                              <strong style="color:#111827;font-size:14px;">${tx.description}</strong><br/>
                              <span style="color:#6b7280;font-size:12px;">
                                ${tx.daysUntilDue === 0 ? '⏰ Vence hoje' : 
                                  tx.daysUntilDue < 0 ? `🔴 Vencida há ${Math.abs(tx.daysUntilDue)} dia(s)` :
                                  `📅 Vence em ${tx.daysUntilDue} dia(s)`}
                              </span>
                            </td>
                            <td style="text-align:right;vertical-align:top;white-space:nowrap;">
                              <strong style="color:#27ae60;font-size:14px;">R$ ${tx.amount.toFixed(2)}</strong>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  `).join('')}
                </table>
              ` : ''}

              ${company.payables.length > 0 ? `
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <h4 style="color:#e74c3c;margin:0 0 12px;font-size:15px;">💸 Contas a Pagar (R$ ${company.totalPayables.toFixed(2)})</h4>
                    </td>
                  </tr>
                  ${company.payables.map(tx => `
                    <tr>
                      <td style="border-bottom:1px solid #e5e7eb;padding:10px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align:top;">
                              <strong style="color:#111827;font-size:14px;">${tx.description}</strong><br/>
                              <span style="color:#6b7280;font-size:12px;">
                                ${tx.daysUntilDue === 0 ? '⏰ Vence hoje' : 
                                  tx.daysUntilDue < 0 ? `🔴 Vencida há ${Math.abs(tx.daysUntilDue)} dia(s)` :
                                  `📅 Vence em ${tx.daysUntilDue} dia(s)`}
                              </span>
                            </td>
                            <td style="text-align:right;vertical-align:top;white-space:nowrap;">
                              <strong style="color:#e74c3c;font-size:14px;">R$ ${tx.amount.toFixed(2)}</strong>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  `).join('')}
                </table>
              ` : ''}
            </td>
          </tr>
        </table>
      `;
    }

    // Se não houver empresas com transações, mostrar mensagem
    if (companiesHtml === '') {
      companiesHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8f5e9;">
          <tr>
            <td style="padding:20px;text-align:center;">
              <p style="color:#27ae60;margin:0;font-size:15px;">✅ Nenhuma transação vencendo nos próximos 7 dias!</p>
            </td>
          </tr>
        </table>
      `;
    }

    html = html.replace('{{companiesContent}}', companiesHtml);

    return html;
  }

  /**
   * Envia notificação de nova resposta no ticket de suporte
   */
  async sendSupportTicketReply(
    to: string,
    ticketTitle: string,
    ticketId: string,
    userId: string
  ): Promise<{ success: boolean; messageId?: string; error?: any }> {
    try {
      if (!this.apiKey) {
        console.log('📧 [MODO DEV] Email de suporte não enviado (sem API key):', { to, ticketId });
        return { success: true, messageId: 'dev-mode-skip' };
      }

      const subject = `Nova resposta no seu chamado: ${ticketTitle}`;
      const frontendUrl = process.env.FRONTEND_URL;
      const unsubscribeUrl = `${frontendUrl}/unsubscribe?user_id=${userId}`;

      const content = `
        <h2 style="color:#111827;margin:0 0 20px 0;font-size:20px;font-weight:600;">Nova Resposta no seu Chamado</h2>
        <p style="color:#374151;line-height:1.6;margin:0 0 20px 0;font-size:15px;">
          Olá! 👋
        </p>
        <p style="color:#374151;line-height:1.6;margin:0 0 20px 0;font-size:15px;">
          Você recebeu uma nova resposta no seu chamado de suporte:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;border-radius:8px;margin:20px 0;">
          <tr>
            <td style="padding:20px;">
              <p style="color:#111827;margin:0;font-size:16px;font-weight:600;">${ticketTitle}</p>
              <p style="color:#6b7280;margin:10px 0 0 0;font-size:14px;">ID: #${ticketId.substring(0, 8)}</p>
            </td>
          </tr>
        </table>
        <p style="color:#374151;line-height:1.6;margin:20px 0;font-size:15px;">
          Nossa equipe respondeu sua solicitação. Acesse o sistema para visualizar a resposta completa.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:30px 0;">
          <tr>
            <td style="background-color:#000000;border-radius:8px;padding:14px 28px;text-align:center;">
              <a href="${frontendUrl}/help/support/${ticketId}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
                Ver Chamado
              </a>
            </td>
          </tr>
        </table>
      `;

      let html = this.supportTemplate
        .replace('{{subject}}', subject)
        .replace('{{content}}', content)
        .replace('{{unsubscribeUrl}}', unsubscribeUrl);

      const result = await this.sendWithRetry({
        from: this.fromEmail,
        to: [to],
        subject,
        html
      });

      if (!result.success) {
        console.error('❌ Erro ao enviar email de notificação de suporte:', result.error);
        return { success: false, error: result.error };
      }

      console.log('✅ Email de notificação de suporte enviado:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar email de notificação de suporte:', error);
      return { success: false, error };
    }
  }
}
