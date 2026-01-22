import { supabaseAdmin } from '../config/database';

/**
 * Job para verificar transações vencidas e criar notificações
 * Deve ser executado periodicamente (ex: a cada hora)
 */
export async function checkOverdueTransactions() {
  try {
    console.log('[CRON] Verificando transações vencidas...');

    // Usar service role para acessar todas as transações (bypass RLS)

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar para início do dia

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const in2Days = new Date(today);
    in2Days.setDate(in2Days.getDate() + 2);

    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const in4Days = new Date(today);
    in4Days.setDate(in4Days.getDate() + 4);

    // Buscar transações que vencem amanhã
    const { data: dueTomorrow, error: dueTomorrowError } = await supabaseAdmin
      .from('transactions')
      .select('*, companies!inner(user_id)')
      .eq('status', 'pending')
      .eq('is_credit_card', false)
      .gte('date', tomorrow.toISOString().split('T')[0])
      .lt('date', in2Days.toISOString().split('T')[0]);

    if (dueTomorrowError) {
      console.error('Error fetching due tomorrow transactions:', dueTomorrowError);
    } else if (dueTomorrow && dueTomorrow.length > 0) {
      console.log(`[CRON] Encontradas ${dueTomorrow.length} transações que vencem amanhã`);

      for (const transaction of dueTomorrow) {
        const { data: existingNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', transaction.companies.user_id)
          .eq('company_id', transaction.company_id)
          .eq('type', 'warning')
          .like('message', `%${transaction.id}%`)
          .like('message', '%amanhã%')
          .gte('created_at', today.toISOString())
          .single();

        if (!existingNotif) {
          await supabaseAdmin.from('notifications').insert({
            user_id: transaction.companies.user_id,
            company_id: transaction.company_id,
            title: 'Despesa vence amanhã',
            message: `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) vence amanhã - ID: ${transaction.id}`,
            type: 'warning',
            link_to: `/transactions/${transaction.id}`,
          });
        }
      }
    }

    // Buscar transações que vencem em 2 dias
    const { data: dueIn2Days, error: dueIn2DaysError } = await supabaseAdmin
      .from('transactions')
      .select('*, companies!inner(user_id)')
      .eq('status', 'pending')
      .eq('is_credit_card', false)
      .gte('date', in2Days.toISOString().split('T')[0])
      .lt('date', in3Days.toISOString().split('T')[0]);

    if (dueIn2DaysError) {
      console.error('Error fetching due in 2 days transactions:', dueIn2DaysError);
    } else if (dueIn2Days && dueIn2Days.length > 0) {
      console.log(`[CRON] Encontradas ${dueIn2Days.length} transações que vencem em 2 dias`);

      for (const transaction of dueIn2Days) {
        const { data: existingNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', transaction.companies.user_id)
          .eq('company_id', transaction.company_id)
          .eq('type', 'warning')
          .like('message', `%${transaction.id}%`)
          .like('message', '%em 2 dias%')
          .gte('created_at', today.toISOString())
          .single();

        if (!existingNotif) {
          await supabaseAdmin.from('notifications').insert({
            user_id: transaction.companies.user_id,
            company_id: transaction.company_id,
            title: 'Despesa vence em 2 dias',
            message: `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) vence em 2 dias - ID: ${transaction.id}`,
            type: 'warning',
            link_to: `/transactions/${transaction.id}`,
          });
        }
      }
    }

    // Buscar transações que vencem em 3 dias
    const { data: dueIn3Days, error: dueIn3DaysError } = await supabaseAdmin
      .from('transactions')
      .select('*, companies!inner(user_id)')
      .eq('status', 'pending')
      .eq('is_credit_card', false)
      .gte('date', in3Days.toISOString().split('T')[0])
      .lt('date', in4Days.toISOString().split('T')[0]);

    if (dueIn3DaysError) {
      console.error('Error fetching due in 3 days transactions:', dueIn3DaysError);
    } else if (dueIn3Days && dueIn3Days.length > 0) {
      console.log(`[CRON] Encontradas ${dueIn3Days.length} transações que vencem em 3 dias`);

      for (const transaction of dueIn3Days) {
        const { data: existingNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', transaction.companies.user_id)
          .eq('company_id', transaction.company_id)
          .eq('type', 'warning')
          .like('message', `%${transaction.id}%`)
          .like('message', '%em 3 dias%')
          .gte('created_at', today.toISOString())
          .single();

        if (!existingNotif) {
          await supabaseAdmin.from('notifications').insert({
            user_id: transaction.companies.user_id,
            company_id: transaction.company_id,
            title: 'Despesa vence em 3 dias',
            message: `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) vence em 3 dias - ID: ${transaction.id}`,
            type: 'warning',
            link_to: `/transactions/${transaction.id}`,
          });
        }
      }
    }

    // Buscar transações que vencem hoje (para notificação de "vence hoje")
    const { data: dueToday, error: dueTodayError } = await supabaseAdmin
      .from('transactions')
      .select('*, companies!inner(user_id)')
      .eq('status', 'pending')
      .eq('is_credit_card', false)
      .gte('date', today.toISOString().split('T')[0])
      .lt('date', tomorrow.toISOString().split('T')[0]);

    if (dueTodayError) {
      console.error('Error fetching due today transactions:', dueTodayError);
    } else if (dueToday && dueToday.length > 0) {
      console.log(`[CRON] Encontradas ${dueToday.length} transações que vencem hoje`);

      for (const transaction of dueToday) {
        // Verificar se já existe notificação para esta transação hoje
        const { data: existingNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', transaction.companies.user_id)
          .eq('company_id', transaction.company_id)
          .eq('type', 'expense_due')
          .like('message', `%${transaction.id}%`)
          .gte('created_at', today.toISOString())
          .single();

        if (!existingNotif) {
          await supabaseAdmin.from('notifications').insert({
            user_id: transaction.companies.user_id,
            company_id: transaction.company_id,
            title: 'Despesa vence hoje',
            message: `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) vence hoje - ID: ${transaction.id}`,
            type: 'expense_due',
            link_to: `/transactions/${transaction.id}`,
          });
        }
      }
    }

    // Buscar transações vencidas (status pending com data passada)
    const { data: overdue, error: overdueError } = await supabaseAdmin
      .from('transactions')
      .select('*, companies!inner(user_id)')
      .eq('status', 'pending')
      .eq('is_credit_card', false)
      .lt('date', today.toISOString().split('T')[0]);

    if (overdueError) {
      console.error('Error fetching overdue transactions:', overdueError);
    } else if (overdue && overdue.length > 0) {
      console.log(`[CRON] Encontradas ${overdue.length} transações vencidas`);

      for (const transaction of overdue) {
        // Verificar se já existe notificação de vencido para esta transação hoje
        const { data: existingNotif, error: existingNotifError } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', transaction.companies.user_id)
          .eq('company_id', transaction.company_id)
          .eq('type', 'expense_overdue')
          .like('message', `%${transaction.id}%`)
          .gte('created_at', today.toISOString())
          .single();

        if(existingNotifError) {
          console.error('Error checking existing notification:', existingNotifError);
          //continue;
        }

        if (!existingNotif) {
          const daysOverdue = Math.floor(
            (today.getTime() - new Date(transaction.date).getTime()) / (1000 * 60 * 60 * 24)
          );

          await supabaseAdmin.from('notifications').insert({
            user_id: transaction.companies.user_id,
            company_id: transaction.company_id,
            title: 'Despesa vencida',
            message: `${transaction.description} (R$ ${Number(transaction.amount).toFixed(2)}) está vencida há ${daysOverdue} dia(s)`,
            type: 'expense_overdue',
            link_to: `/transactions/${transaction.id}`,
          });
        }
      }
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
