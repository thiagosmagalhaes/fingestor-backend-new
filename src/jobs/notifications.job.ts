import { supabaseAdmin } from '../config/database';

interface NotificationToCreate {
  user_id: string;
  company_id: string;
  title: string;
  message: string;
  type: string;
  link_to: string;
  transaction_id: string;
}

/**
 * Job para verificar transações vencidas e criar notificações
 * Deve ser executado periodicamente (ex: a cada hora)
 */
export async function checkOverdueTransactions() {
  try {
    console.log('[CRON] Verificando transações vencidas...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const in2Days = new Date(today);
    in2Days.setDate(in2Days.getDate() + 2);

    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const in4Days = new Date(today);
    in4Days.setDate(in4Days.getDate() + 4);

    // Array para acumular todas as notificações a serem criadas
    const notificationsToCreate: NotificationToCreate[] = [];

    // Buscar todas as transações pendentes de uma vez
    const { data: allTransactions, error: allTxError } = await supabaseAdmin
      .from('transactions')
      .select('*, companies!inner(user_id)')
      .eq('status', 'pending')
      .eq('is_credit_card', false)
      .lt('date', in4Days.toISOString().split('T')[0]);

    if (allTxError) {
      console.error('Error fetching transactions:', allTxError);
      return;
    }

    if (!allTransactions || allTransactions.length === 0) {
      console.log('[CRON] Nenhuma transação pendente encontrada');
      return;
    }

    console.log(`[CRON] Encontradas ${allTransactions.length} transações pendentes`);

    // Processar transações e determinar quais notificações criar
    for (const transaction of allTransactions) {
      const txDate = new Date(transaction.date + 'T00:00:00');
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const in2DaysStr = in2Days.toISOString().split('T')[0];
      const in3DaysStr = in3Days.toISOString().split('T')[0];

      let notifType: string | null = null;
      let notifTitle = '';
      let notifMessage = '';

      // Determinar tipo de notificação baseado na data
      if (transaction.date < todayStr) {
        // Transação vencida
        const daysOverdue = Math.floor(
          (today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        notifType = 'expense_overdue';
        notifTitle = 'Despesa vencida';
        notifMessage = `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) está vencida há ${daysOverdue} dia(s)`;
      } else if (transaction.date === todayStr) {
        // Vence hoje
        notifType = 'expense_due';
        notifTitle = 'Despesa vence hoje';
        notifMessage = `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) vence hoje - ID: ${transaction.id}`;
      } else if (transaction.date === tomorrowStr) {
        // Vence amanhã
        notifType = 'warning';
        notifTitle = 'Despesa vence amanhã';
        notifMessage = `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) vence amanhã - ID: ${transaction.id}`;
      } else if (transaction.date === in2DaysStr) {
        // Vence em 2 dias
        notifType = 'warning';
        notifTitle = 'Despesa vence em 2 dias';
        notifMessage = `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) vence em 2 dias - ID: ${transaction.id}`;
      } else if (transaction.date === in3DaysStr) {
        // Vence em 3 dias
        notifType = 'warning';
        notifTitle = 'Despesa vence em 3 dias';
        notifMessage = `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) vence em 3 dias - ID: ${transaction.id}`;
      }

      // Se há uma notificação a ser criada, adicionar ao array
      if (notifType) {
        notificationsToCreate.push({
          user_id: transaction.companies.user_id,
          company_id: transaction.company_id,
          title: notifTitle,
          message: notifMessage,
          type: notifType,
          link_to: `/transactions/${transaction.id}`,
          transaction_id: transaction.id,
        });
      }
    }

    console.log(`[CRON] ${notificationsToCreate.length} notificações candidatas a serem criadas`);

    // Buscar notificações existentes de hoje para evitar duplicatas
    const { data: existingNotifications, error: existingError } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id, company_id, type, message')
      .gte('created_at', today.toISOString());

    if (existingError) {
      console.error('Error fetching existing notifications:', existingError);
    }

    // Filtrar notificações que ainda não existem e inserir em lote
    const notificationsToInsert = notificationsToCreate.filter(notif => {
      // Verificar se já existe notificação similar hoje
      const exists = existingNotifications?.some(existing => 
        existing.user_id === notif.user_id &&
        existing.company_id === notif.company_id &&
        existing.type === notif.type &&
        existing.message.includes(notif.transaction_id)
      );
      return !exists;
    });

    if (notificationsToInsert.length > 0) {
      console.log(`[CRON] Inserindo ${notificationsToInsert.length} novas notificações`);
      
      // Remover transaction_id antes de inserir (não existe na tabela)
      const notificationsData = notificationsToInsert.map(({ transaction_id, ...notif }) => notif);
      
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(notificationsData);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
      } else {
        console.log(`[CRON] ${notificationsToInsert.length} notificações criadas com sucesso`);
      }
    } else {
      console.log('[CRON] Nenhuma notificação nova a ser criada');
    }

    console.log('[CRON] Verificação de transações vencidas concluída');
  } catch (error) {
    console.error('[CRON] Erro ao verificar transações vencidas:', error);
  }
}

/**
 * Inicia o cron job para verificar transações vencidas
 * Executa a cada 1 hora
 */
export function startNotificationsCron() {
  console.log('[CRON] Iniciando job de notificações...');

  // Executar imediatamente na inicialização
  checkOverdueTransactions();

  // Executar a cada 1 hora (3600000 ms)
  setInterval(checkOverdueTransactions, 3600000);

  console.log('[CRON] Job de notificações agendado para executar a cada 1 hora');
}
