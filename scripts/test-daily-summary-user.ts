/**
 * Script para testar o job de resumo diário para um usuário específico
 * 
 * Uso: npx ts-node scripts/test-daily-summary-user.ts <user_id>
 * Exemplo: npx ts-node scripts/test-daily-summary-user.ts 498a770e-d832-40cf-95d2-a05b4c10cb99
 */

import { EmailService } from '../src/services/email.service';
import { supabaseAdmin } from '../src/config/database';
import { encryptUserIdWithIV } from '../src/utils/crypto.utils';
import { CompanySummary, TransactionSummary } from '../src/types/newsletter.types';

const emailService = new EmailService();

async function sendDailySummaryToUser(userId: string) {
  console.log(`🧪 Testando envio de resumo diário para usuário: ${userId}\n`);
  
  try {
    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Usuário não encontrado:', profileError);
      return;
    }

    if (!profile.email) {
      console.error('❌ Usuário não tem email cadastrado');
      return;
    }

    console.log(`📧 Email: ${profile.email}`);
    console.log(`👤 Nome: ${profile.full_name || 'Usuário'}\n`);

    const userEmail = profile.email;
    const userName = profile.full_name || 'Usuário';

    // Definir período: próximos 7 dias
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    console.log(`📅 Buscando transações entre ${today.toLocaleDateString()} e ${sevenDaysFromNow.toLocaleDateString()}\n`);

    // Buscar empresas do usuário
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('user_id', userId);

    if (companiesError || !companies || companies.length === 0) {
      console.log('⚠️  Usuário não tem empresas ativas', companiesError);
      return;
    }

    console.log(`🏢 Empresas encontradas: ${companies.length}`);
    companies.forEach(c => console.log(`   - ${c.name} (${c.id})`));
    console.log('');

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

      if (txError) {
        console.error(`❌ Erro ao buscar transações da empresa ${company.name}:`, txError);
        continue;
      }

      if (!transactions || transactions.length === 0) {
        console.log(`   📊 ${company.name}: nenhuma transação vencendo`);
        continue;
      }

      console.log(`   📊 ${company.name}: ${transactions.length} transação(ões)`);

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
          console.log(`      💰 ${tx.description} - R$ ${Number(tx.amount).toFixed(2)} (${daysUntilDue} dias)`);
        } else {
          payables.push(summary);
          totalPayables += Number(tx.amount);
          console.log(`      💸 ${tx.description} - R$ ${Number(tx.amount).toFixed(2)} (${daysUntilDue} dias)`);
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

    console.log('');

    // Verificar se há transações
    if (companiesSummary.length === 0) {
      console.log('⚠️  Nenhuma transação vencendo nos próximos 7 dias');
      console.log('💡 Dica: O email só é enviado se houver transações pendentes vencendo');
      return;
    }

    console.log(`💰 Total a Receber: R$ ${totalReceivables.toFixed(2)}`);
    console.log(`💸 Total a Pagar: R$ ${totalPayables.toFixed(2)}\n`);

    // Gerar token de unsubscribe
    const unsubscribeToken = encryptUserIdWithIV(userId);
    const unsubscribeUrl = `${process.env.FRONTEND_URL || 'https://fingestor.com'}/unsubscribe?token=${unsubscribeToken}`;

    // Enviar email
    const emailData = {
      emailSubject: '📊 Resumo Diário - Transações Vencendo (TESTE)',
      userName,
      companies: companiesSummary,
      totalReceivables,
      totalPayables,
      unsubscribeUrl
    };

    console.log('📤 Enviando email...\n');

    const result = await emailService.sendDailySummary(userEmail, emailData);

    if (result.success) {
      console.log('✅ Email enviado com sucesso!');
      console.log(`📨 Message ID: ${result.messageId}`);
      
      // Registrar no log (opcional para teste)
      await supabaseAdmin
        .from('newsletter_logs')
        .insert({
          user_id: userId,
          newsletter_type: 'daily_summary',
          email_sent_to: userEmail,
          resend_message_id: result.messageId,
          sent_at: new Date().toISOString()
        });
      
      console.log('📝 Registro salvo em newsletter_logs');
    } else {
      console.error('❌ Falha no envio:', result.error);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Obter user_id do argumento de linha de comando
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Erro: user_id não fornecido');
  console.log('Uso: npx ts-node scripts/test-daily-summary-user.ts <user_id>');
  console.log('Exemplo: npx ts-node scripts/test-daily-summary-user.ts 498a770e-d832-40cf-95d2-a05b4c10cb99');
  process.exit(1);
}

sendDailySummaryToUser(userId)
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
