import { EmailService } from '../services/email.service';
import { supabaseAdmin } from '../config/database';
import { encryptUserIdWithIV } from '../utils/crypto.utils';
import { TRIAL_DAYS } from '../controllers/subscriptions.controller';

const emailService = new EmailService();

/**
 * Verifica e envia emails para usuarios com trial expirando em 3 dias
 * Deve ser executado periodicamente (ex: diariamente)
 */
export async function checkTrialExpiring() {
  console.log('[TRIAL JOB] Verificando trials expirando...');
  
  try {
    // Buscar usuarios que criaram conta ha 12 dias (trial de 15 dias - 3 dias de aviso)
    const twelveThirteenDaysAgo = new Date();
    twelveThirteenDaysAgo.setDate(twelveThirteenDaysAgo.getDate() - 12);
    const thirteenDaysAgo = new Date();
    thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13);

    // Buscar usuarios em trial que nao tem assinatura ativa
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, full_name, created_at')
      .gte('created_at', thirteenDaysAgo.toISOString())
      .lte('created_at', twelveThirteenDaysAgo.toISOString());

    if (profileError) {
      console.error('[ERRO] Erro ao buscar profiles:', profileError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('[INFO] Nenhum usuario com trial expirando em 3 dias');
      return;
    }

    console.log(`[INFO] Encontrados ${profiles.length} usuario(s) potencialmente em trial expirando`);

    // Filtrar apenas usuarios que NAO tem assinatura ativa
    const usersToNotify = [];

    for (const profile of profiles) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('id, status')
        .eq('user_id', profile.user_id)
        .in('status', ['active', 'trialing'])
        .single();

      // Se nao tem assinatura ativa, adiciona na lista
      if (!subscription) {
        usersToNotify.push(profile);
      }
    }

    if (usersToNotify.length === 0) {
      console.log('[INFO] Todos os usuarios ja tem assinatura ativa');
      return;
    }

    console.log(`[INFO] Enviando newsletter para ${usersToNotify.length} usuario(s)`);

    // Enviar newsletter para cada usuario
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const user of usersToNotify) {
      try {
        // Verificar se ja enviou newsletter de trial_expiring nas ultimas 24 horas
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data: existingLog } = await supabaseAdmin
          .from('newsletter_logs')
          .select('id, sent_at')
          .eq('user_id', user.user_id)
          .eq('newsletter_type', 'trial_expiring')
          .gte('sent_at', twentyFourHoursAgo.toISOString())
          .single();

        if (existingLog) {
          const sentDate = new Date(existingLog.sent_at).toLocaleString();
          console.log('[SKIP] Pulando ' + user.email + ' (ja enviado em ' + sentDate + ')');
          skippedCount++;
          continue;
        }

        // Calcular dias restantes exatos
        const userCreatedAt = new Date(user.created_at);
        const trialEndsAt = new Date(userCreatedAt);
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
        
        const now = new Date();
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Gerar token de unsubscribe usando criptografia AES
        const unsubscribeToken = encryptUserIdWithIV(user.user_id);

        const result = await emailService.sendTrialExpiringNewsletter(
          user.email,
          user.full_name || 'Usuario',
          daysRemaining,
          unsubscribeToken
        );

        if (result.success && result.messageId) {
          console.log('[OK] Email enviado para ' + user.email + ' (' + daysRemaining + ' dias restantes)');
          successCount++;

          // Registrar envio bem-sucedido
          await supabaseAdmin.from('newsletter_logs').insert({
            user_id: user.user_id,
            newsletter_type: 'trial_expiring',
            email: user.email,
            success: true,
            metadata: {
              days_remaining: daysRemaining,
              message_id: result.messageId
            }
          });
        } else {
          console.error('[ERRO] Falha ao enviar para ' + user.email + ':', result.error);
          errorCount++;

          // Registrar falha
          await supabaseAdmin.from('newsletter_logs').insert({
            user_id: user.user_id,
            newsletter_type: 'trial_expiring',
            email: user.email,
            success: false,
            error_message: JSON.stringify(result.error)
          });
        }

        // Aguardar 1 segundo entre emails para nao sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('[ERRO] Erro ao processar usuario ' + user.email + ':', error);
        errorCount++;
      }
    }

    console.log('\n[RESUMO] Job de trial expirando:');
    console.log('   Enviados: ' + successCount);
    console.log('   Erros: ' + errorCount);
    console.log('   Pulados: ' + skippedCount);
    console.log('   Total processados: ' + usersToNotify.length + '\n');
  } catch (error) {
    console.error('[ERRO GERAL] Erro no job de trial expirando:', error);
  }
}

/**
 * Inicia o job periodico de verificacao de trials expirando
 */
export function startTrialExpiringJob() {
  // Executar a cada 24 horas (diariamente)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  // Executar imediatamente na inicializacao
  checkTrialExpiring();
  
  // Agendar execucoes diarias
  setInterval(() => {
    checkTrialExpiring();
  }, TWENTY_FOUR_HOURS);
  
  console.log('[INFO] Job de trial expirando iniciado (executa a cada 24 horas)');
}

/**
 * Funcao para testar o job manualmente (sem aguardar schedule)
 */
export async function runTrialExpiringJobNow() {
  console.log('[TEST] Executando job de trial expirando manualmente...\n');
  await checkTrialExpiring();
  console.log('\n[TEST] Job manual concluido!');
}
