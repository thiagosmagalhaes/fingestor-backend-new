// Types para o sistema de sessões de caixa do PDV

export interface CashSession {
  id: string;
  company_id: string;
  opened_by: string;
  closed_by?: string;
  opening_amount: number;
  opening_date: string;
  closing_amount?: number;
  closing_date?: string;
  status: 'open' | 'closed';
  opening_notes?: string;
  closing_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OpenCashSessionRequest {
  companyId: string;
  openingAmount: number;
  openingNotes?: string;
}

export interface CloseCashSessionRequest {
  companyId: string;
  closingAmount: number;
  closingNotes?: string;
}
