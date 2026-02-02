/**
 * Recurring frequency in days
 */
export type RecurringFrequency = '7' | '15' | '30';

/**
 * Recurring transaction rule
 */
export interface RecurringTransaction {
  id: string;
  company_id: string;
  category_id?: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  start_date: string; // ISO date
  end_date?: string; // ISO date, optional
  is_active: boolean;
  last_generated_date?: string; // ISO date
  next_generation_date?: string; // ISO date
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request to create a transaction with recurrence
 */
export interface CreateRecurringTransactionRequest {
  company_id: string;
  category_id?: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string; // Start date
  notes?: string;
  
  // Recurring fields
  is_recurring: true;
  recurring_frequency: RecurringFrequency;
  recurring_end_date?: string; // Optional, if not provided generates 1 year
}
