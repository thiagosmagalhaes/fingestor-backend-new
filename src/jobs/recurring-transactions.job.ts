import cron from 'node-cron';
import supabase from '../config/database';
import recurringTransactionsService from '../services/recurring-transactions.service';

/**
 * Job para gerar transações recorrentes automaticamente
 * Executa todos os dias às 00:00
 */
export function startRecurringTransactionsJob() {
  // Executar todos os dias à meia-noite
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 [Recurring Transactions Job] Starting...');
    
    try {
      await recurringTransactionsService.processRecurringTransactions(supabase);
      console.log('✅ [Recurring Transactions Job] Completed successfully');
    } catch (error) {
      console.error('❌ [Recurring Transactions Job] Error:', error);
    }
  });

  console.log('⏰ Recurring transactions job scheduled (daily at 00:00)');
}
