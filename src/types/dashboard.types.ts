export interface DashboardSummary {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  pendingIncome: number;
  pendingExpense: number;
}

export interface OverdueData {
  count: number;
  total: number;
}

export interface CashFlowData {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryBreakdownItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
  transactionCount: number;
}

export interface RecentTransactionItem {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'paid' | 'pending' | 'overdue' | 'scheduled';
  dueDate: string;
  paidDate?: string | null;
  categoryName?: string;
}

export interface CreditCardInvoice {
  creditCardId: string;
  creditCardName: string;
  currentAmount: number;
  dueDate: string;
  closingDate: string;
  isPaid: boolean;
}

export interface SetupStatus {
  hasCompany: boolean;
  hasCategories: boolean;
  hasCreditCards: boolean;
  hasTransactions: boolean;
}

// Estrutura retornada pela função RPC get_cash_flow_chart_data (campos em português)
export interface CashFlowRPCResult {
  month: string;
  month_full: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface TransactionFromDB {
  id: string;
  description: string;
  amount: number;
  type: string;
  status: 'paid' | 'pending' | 'scheduled';
  date: string;
  paid_at: string | null;
  category_id: string | null;
  categories?: { name: string, color: string }[] | { name: string, color: string } | null;
  credit_cards?: { name: string }[] | { name: string } | null;
}
