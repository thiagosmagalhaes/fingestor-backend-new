import cron from 'node-cron';
import { EmailService } from '../services/email.service';
import { supabaseAdmin } from '../config/database';
import { encryptUserIdWithIV } from '../utils/crypto.utils';
import { CompanySummary, TransactionSummary } from '../types/newsletter.types';
import { TRIAL_DAYS } from '../controllers/subscriptions.controller';

const emailService = new EmailService();

/**
 * Envia email de resumo diário para todos os usuários com assinatura ativa
 * Mostra transações que vencem nos próximos 7 dias, organizadas por empresa
 */
export async function sendDailySummaries() {
  console.log('[DAILY SUMMARY] Iniciando envio de resumos diários...');
  
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - TRIAL_DAYS);
    
    // 1. Buscar usuários em trial (criados há menos de 15 dias, sem subscription)
    const { data: trialUsers, error: trialError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, full_name, created_at')
      .gte('created_at', fifteenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (trialError) {
      console.error('[ERRO] Erro ao buscar usuários trial:', trialError);
    }

    // 2. Buscar usuários com subscriptions ativas
    const { data: paidSubscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, status')
      .in('status', ['active', 'trialing']);

    if (subError) {
      console.error('[ERRO] Erro ao buscar assinaturas:', subError);
    }

    // 3. Buscar perfis dos usuários pagos
    const paidUserIds = (paidSubscriptions || []).map(s => s.user_id);
    const { data: paidProfiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, full_name')
      .in('user_id', paidUserIds);

    if (profileError) {
      console.error('[ERRO] Erro ao buscar perfis pagos:', profileError);
    }

    // Combinar usuários trial e pagos (evitando duplicatas)
    const allUsers = new Map();
    
    // Adicionar usuários trial
    (trialUsers || []).forEach(user => {
      allUsers.set(user.user_id, {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        type: 'trial'
      });
    });
    
    // Adicionar usuários pagos (sobrescreve trial se existir)
    (paidProfiles || []).forEach(profile => {
      allUsers.set(profile.user_id, {
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        type: 'paid'
      });
    });

    const users = Array.from(allUsers.values());

    if (users.length === 0) {
      console.log('[INFO] Nenhum usuário ativo encontrado');
      return;
    }

    console.log(`[INFO] Encontrados ${users.length} usuário(s) ativos (trial + pagos)`);

    // Definir período: próximos 7 dias
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Processar cada usuário
    for (const user of users) {
      try {
        const userId = user.user_id;
        const userEmail = user.email;
        const userName = user.full_name || 'Usuário';

        if (!userEmail) {
          console.log(`[SKIP] Usuário ${userId} sem email`);
          skippedCount++;
          continue;
        }

        // Verificar se já enviou resumo nas últimas 20 horas (evita duplicatas)
        const hasRecent = await emailService.hasRecentNewsletter(
          userId,
          'daily_summary',
          20
        );

        if (hasRecent) {
          console.log(`[SKIP] ${userEmail} - já recebeu resumo recentemente`);
          skippedCount++;
          continue;
        }

        // Buscar empresas do usuário
        const { data: companies, error: companiesError } = await supabaseAdmin
          .from('companies')
          .select('id, name')
          .eq('user_id', userId);

        if (companiesError || !companies || companies.length === 0) {
          console.log(`[SKIP] ${userEmail} - sem empresas ativas`);
          skippedCount++;
          continue;
        }

        // Buscar transações pendentes para cada empresa
        const companiesSummary: CompanySummary[] = [];
        let totalReceivables = 0;
        let totalPayables = 0;

        for (const company of companies) {
          // Buscar transações pendentes que vencem nos próximos 7 dias
          const { data: transactions, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('id, description, amount, type, date, status')
            .eq('company_id', company.id)
            .eq('status', 'pending')
            .eq('is_credit_card', false)
            .gte('date', today.toISOString().split('T')[0])
            .lte('date', sevenDaysFromNow.toISOString().split('T')[0])
            .order('date', { ascending: true });

          if (txError || !transactions || transactions.length === 0) {
            continue;
          }

          // Separar em contas a receber e a pagar
          const receivables: TransactionSummary[] = [];
          const payables: TransactionSummary[] = [];

          for (const tx of transactions) {
            const txDate = new Date(tx.date + 'T00:00:00');
            const daysUntilDue = Math.ceil(
              (txDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            const summary: TransactionSummary = {
              id: tx.id,
              description: tx.description,
              amount: Number(tx.amount),
              date: tx.date,
              status: tx.status,
              type: tx.type as 'income' | 'expense',
              daysUntilDue
            };

            if (tx.type === 'income') {
              receivables.push(summary);
              totalReceivables += Number(tx.amount);
            } else {
              payables.push(summary);
              totalPayables += Number(tx.amount);
            }
          }

          // Adicionar empresa ao resumo apenas se tiver transações
          if (receivables.length > 0 || payables.length > 0) {
            companiesSummary.push({
              id: company.id,
              name: company.name,
              receivables,
              payables,
              totalReceivables: receivables.reduce((sum, tx) => sum + tx.amount, 0),
              totalPayables: payables.reduce((sum, tx) => sum + tx.amount, 0)
            });
          }
        }

        // Pular se não houver transações vencendo
        if (companiesSummary.length === 0) {
          console.log(`[SKIP] ${userEmail} - sem transações vencendo nos próximos 7 dias`);
          skippedCount++;
          continue;
        }

        // Gerar token de unsubscribe
        const unsubscribeToken = encryptUserIdWithIV(userId);
        const unsubscribeUrl = `${process.env.FRONTEND_URL || 'https://fingestor.com'}/unsubscribe?token=${unsubscribeToken}`;

        // Enviar email
        const emailData = {
          emailSubject: '📊 Resumo Diário - Transações Vencendo',
          userName,
          companies: companiesSummary,
          totalReceivables,
          totalPayables,
          unsubscribeUrl
        };

        const result = await emailService.sendDailySummary(userEmail, emailData);

        if (result.success) {
          // Registrar no log
          await supabaseAdmin
            .from('newsletter_logs')
            .insert({
              user_id: userId,
              newsletter_type: 'daily_summary',
              email_sent_to: userEmail,
              resend_message_id: result.messageId,
              sent_at: new Date().toISOString()
            });

          console.log(`[SUCCESS] ${userEmail} - Resumo enviado`);
          successCount++;
        } else {
          console.error(`[ERROR] ${userEmail} - Falha no envio:`, result.error);
          errorCount++;
        }

        // Pequeno delay entre envios para não sobrecarregar API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[ERROR] Erro ao processar usuário:`, error);
        errorCount++;
      }
    }

    console.log('[DAILY SUMMARY] Finalizado:', {
      total: users.length,
      sucesso: successCount,
      erros: errorCount,
      pulados: skippedCount
    });

  } catch (error) {
    console.error('[ERRO] Erro fatal no job de resumo diário:', error);
  }
}

/**
 * Inicia o job de resumo diário
 * Executa todos os dias às 8h da manhã (horário local do servidor)
 */
export function startDailySummaryJob() {
  // Agendar execução diária às 8h usando cron
  // Formato: segundo minuto hora dia mês dia-da-semana
  cron.schedule('0 8 * * *', async () => {
    console.log('[DAILY SUMMARY] Executando job agendado...');
    await sendDailySummaries();
  }, {
    timezone: 'America/Sao_Paulo' // Ajuste o timezone conforme necessário
  });
  
  console.log('✅ Job de resumo diário configurado (executa todos os dias às 8h)');
}

/**
 * Função para executar o job manualmente (para testes)
 */
export async function runDailySummaryJobNow() {
  console.log('[TEST] Executando job de resumo diário manualmente...\n');
  await sendDailySummaries();
  console.log('\n[TEST] Job manual concluído!');
}
