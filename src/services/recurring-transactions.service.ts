import { SupabaseClient } from '@supabase/supabase-js';
import { RecurringTransaction, RecurringFrequency } from '../types/recurring-transactions.types';

/**
 * Service to handle recurring transactions generation
 */
export class RecurringTransactionsService {
  
  /**
   * Creates a recurring transaction rule and generates initial transactions
   */
  async createRecurringTransaction(
    supabase: SupabaseClient,
    data: {
      company_id: string;
      category_id?: string;
      type: 'income' | 'expense';
      description: string;
      amount: number;
      frequency: RecurringFrequency;
      start_date: string;
      end_date?: string;
      notes?: string;
    }
  ): Promise<RecurringTransaction> {
    // Calculate end_date if not provided (1 year from start)
    const startDate = new Date(data.start_date);
    const endDate = data.end_date 
      ? new Date(data.end_date)
      : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());

    // Create recurring rule
    const { data: recurringRule, error: recurringError } = await supabase
      .from('recurring_transactions')
      .insert({
        company_id: data.company_id,
        category_id: data.category_id,
        type: data.type,
        description: data.description,
        amount: data.amount,
        frequency: data.frequency,
        start_date: data.start_date,
        end_date: data.end_date || endDate.toISOString().split('T')[0],
        is_active: true,
        last_generated_date: null,
        next_generation_date: data.start_date,
        notes: data.notes
      })
      .select()
      .single();

    if (recurringError || !recurringRule) {
      throw new Error(`Failed to create recurring rule: ${recurringError?.message}`);
    }

    // Generate all transactions up to end_date
    await this.generateTransactionsForRecurrence(supabase, recurringRule);

    return recurringRule;
  }

  /**
   * Generates transactions for a recurring rule
   */
  async generateTransactionsForRecurrence(
    supabase: SupabaseClient,
    recurringRule: RecurringTransaction
  ): Promise<number> {
    const frequencyDays = parseInt(recurringRule.frequency);
    const startDate = new Date(recurringRule.start_date);
    const endDate = new Date(recurringRule.end_date || this.getOneYearFromNow());
    
    const lastGenerated = recurringRule.last_generated_date 
      ? new Date(recurringRule.last_generated_date)
      : new Date(startDate.getTime() - 1); // Start from before start_date

    const transactions = [];
    let currentDate = new Date(lastGenerated);
    
    // Incrementar data conforme frequência
    if (frequencyDays === 30) {
      // Para mensal, incrementa o mês mantendo o mesmo dia
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + frequencyDays);
    }

    // If this is the first generation, start from start_date
    if (!recurringRule.last_generated_date) {
      currentDate = new Date(startDate);
    }

    let count = 0;
    const MAX_BATCH = 500; // Safety limit

    while (currentDate <= endDate && count < MAX_BATCH) {
      transactions.push({
        company_id: recurringRule.company_id,
        category_id: recurringRule.category_id,
        type: recurringRule.type,
        description: recurringRule.description,
        amount: recurringRule.amount,
        date: currentDate.toISOString().split('T')[0],
        due_date: currentDate.toISOString().split('T')[0],
        status: this.getInitialStatus(currentDate),
        notes: recurringRule.notes,
        recurring_transaction_id: recurringRule.id,
        is_installment: false,
        is_credit_card: false
      });

      // Incrementar data conforme frequência
      if (frequencyDays === 30) {
        // Para mensal, incrementa o mês mantendo o mesmo dia
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + frequencyDays);
      }
      count++;
    }

    if (transactions.length === 0) {
      return 0;
    }

    // Insert transactions in batches
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactions);

    if (insertError) {
      throw new Error(`Failed to insert transactions: ${insertError.message}`);
    }

    // Update recurring rule with last_generated_date and next_generation_date
    const lastTransactionDate = transactions[transactions.length - 1].date;
    const nextDate = new Date(lastTransactionDate);
    
    // Incrementar data conforme frequência
    if (frequencyDays === 30) {
      // Para mensal, incrementa o mês mantendo o mesmo dia
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + frequencyDays);
    }

    await supabase
      .from('recurring_transactions')
      .update({
        last_generated_date: lastTransactionDate,
        next_generation_date: nextDate <= endDate 
          ? nextDate.toISOString().split('T')[0]
          : null
      })
      .eq('id', recurringRule.id);

    return transactions.length;
  }

  /**
   * Get initial status based on date
   */
  private getInitialStatus(date: Date): 'pending' | 'scheduled' {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    return date <= today ? 'pending' : 'scheduled';
  }

  /**
   * Get date 1 year from now
   */
  private getOneYearFromNow(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }

  /**
   * Process recurring transactions that need generation (for cron job)
   */
  async processRecurringTransactions(supabase: SupabaseClient): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Get active recurring transactions that need generation
    const { data: recurringRules, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_generation_date', today)
      .not('next_generation_date', 'is', null);

    if (error || !recurringRules) {
      console.error('Error fetching recurring rules:', error);
      return;
    }

    console.log(`Found ${recurringRules.length} recurring rules to process`);

    for (const rule of recurringRules) {
      try {
        const generated = await this.generateTransactionsForRecurrence(supabase, rule);
        console.log(`Generated ${generated} transactions for recurring rule ${rule.id}`);
      } catch (error) {
        console.error(`Error generating transactions for rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Pause a recurring transaction
   */
  async pauseRecurringTransaction(
    supabase: SupabaseClient,
    recurringId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: false })
      .eq('id', recurringId);

    if (error) {
      throw new Error(`Failed to pause recurring transaction: ${error.message}`);
    }
  }

  /**
   * Resume a recurring transaction
   */
  async resumeRecurringTransaction(
    supabase: SupabaseClient,
    recurringId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: true })
      .eq('id', recurringId);

    if (error) {
      throw new Error(`Failed to resume recurring transaction: ${error.message}`);
    }
  }

  /**
   * Cancel a recurring transaction (soft delete)
   */
  async cancelRecurringTransaction(
    supabase: SupabaseClient,
    recurringId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', recurringId);

    if (error) {
      throw new Error(`Failed to cancel recurring transaction: ${error.message}`);
    }
  }
}

export default new RecurringTransactionsService();
