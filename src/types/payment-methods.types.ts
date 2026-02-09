// Types para o sistema de formas de pagamento do PDV

export interface PaymentMethod {
  id: string;
  company_id: string;
  name: string;
  type: 'cash' | 'pix' | 'card' | 'other';
  card_type?: 'debit' | 'credit' | 'both';
  card_brand?: string;
  fee_percentage: number;
  fee_fixed_amount: number;
  installment_fees: Record<string, number>; // Ex: {"1": 2.5, "2": 3.0, "3": 3.5}
  is_active: boolean;
  is_default: boolean;
  allow_installments: boolean;
  max_installments: number;
  min_installment_amount: number;
  days_to_receive: number; // Número de dias até o recebimento (D+N)
  display_order: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreatePaymentMethodRequest {
  companyId: string;
  name: string;
  type: 'cash' | 'pix' | 'card' | 'other';
  cardType?: 'debit' | 'credit' | 'both';
  cardBrand?: string;
  feePercentage?: number;
  feeFixedAmount?: number;
  installmentFees?: Record<string, number>;
  isActive?: boolean;
  isDefault?: boolean;
  allowInstallments?: boolean;
  maxInstallments?: number;
  minInstallmentAmount?: number;
  daysToReceive?: number; // Número de dias até o recebimento (D+N)
  displayOrder?: number;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentMethodRequest {
  name?: string;
  type?: 'cash' | 'pix' | 'card' | 'other';
  cardType?: 'debit' | 'credit' | 'both';
  cardBrand?: string;
  feePercentage?: number;
  feeFixedAmount?: number;
  installmentFees?: Record<string, number>;
  isActive?: boolean;
  isDefault?: boolean;
  allowInstallments?: boolean;
  maxInstallments?: number;
  minInstallmentAmount?: number;
  daysToReceive?: number; // Número de dias até o recebimento (D+N)
  displayOrder?: number;
  metadata?: Record<string, any>;
}

/**
 * Helper para calcular a taxa de uma forma de pagamento
 */
export interface CalculateFeeRequest {
  paymentMethodId: string;
  amount: number;
  installments?: number;
}

export interface CalculateFeeResponse {
  amount: number; // Valor original
  feeAmount: number; // Valor da taxa
  totalAmount: number; // Valor total (amount + feeAmount)
  feePercentage: number; // % aplicada
  feeFixedAmount: number; // Valor fixo aplicado
}
