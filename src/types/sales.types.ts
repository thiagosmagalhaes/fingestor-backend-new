// Types para o sistema de PDV e Vendas

export interface Sale {
  id: string;
  company_id: string;
  customer_id?: string;
  budget_id?: string;
  sale_number: string;
  customer_name?: string;
  customer_document?: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  tax_amount: number;
  total_amount: number;
  payment_method?: string; // Mantido por compatibilidade
  payment_method_id?: string; // FK para payment_methods (novo)
  payment_status: 'pending' | 'paid' | 'partial' | 'cancelled' | 'refunded';
  paid_amount: number;
  change_amount: number;
  status: 'draft' | 'completed' | 'cancelled' | 'refunded';
  sale_date: string;
  cancelled_at?: string;
  refunded_at?: string;
  notes?: string;
  cancellation_reason?: string;
  nfce_number?: string;
  nfce_key?: string;
  nfce_status?: string;
  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_service_id?: string;
  item_type: 'product' | 'service';
  sku?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  discount_percentage: number;
  tax_percentage: number;
  total_amount: number;
  cost_price?: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentInstallment {
  id: string;
  sale_id: string;
  installment_number: number;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_at?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: string; // Mantido por compatibilidade
  payment_method_id?: string; // FK para payment_methods (novo)
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSaleRequest {
  companyId: string;
  customerId?: string;
  budgetId?: string;
  saleDate?: string; // Data da venda (ISO string)
  customerName?: string; // Será buscado do cliente se customerId for fornecido
  customerDocument?: string; // Será buscado do cliente se customerId for fornecido
  discountAmount?: number;
  discountPercentage?: number;
  taxAmount?: number;
  paymentMethod?: string; // Mantido por compatibilidade (nome da forma)
  paymentMethodId?: string; // UUID da forma de pagamento (preferido)
  paymentStatus?: 'pending' | 'paid' | 'partial';
  paidAmount?: number;
  changeAmount?: number;
  notes?: string;
  items: CreateSaleItemRequest[];
  installmentsCount?: number; // Número de parcelas
}

export interface CreateSaleItemRequest {
  productServiceId: string; // Obrigatório: busca name, sku, itemType, costPrice, etc. do banco
  quantity: number;
  unitPrice: number;
  // Campos opcionais (sobrescrevem dados do produto se enviados)
  name?: string;
  sku?: string;
  description?: string;
  itemType?: 'product' | 'service';
  discountAmount?: number;
  discountPercentage?: number;
  taxPercentage?: number;
  costPrice?: number;
  sortOrder?: number;
}

export interface UpdateSaleRequest {
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  discountAmount?: number;
  discountPercentage?: number;
  taxAmount?: number;
  paymentMethod?: string; // Mantido por compatibilidade
  paymentMethodId?: string; // UUID da forma de pagamento (preferido)
  paymentStatus?: 'pending' | 'paid' | 'partial' | 'cancelled' | 'refunded';
  paidAmount?: number;
  changeAmount?: number;
  status?: 'draft' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
}

export interface CancelSaleRequest {
  saleId: string;
  reason: string;
}

export interface ConvertBudgetToSaleRequest {
  budgetId: string;
  paymentMethod?: string; // Mantido por compatibilidade
  paymentMethodId?: string; // UUID da forma de pagamento (preferido)
  installments?: number;
}

export interface PayInstallmentRequest {
  installmentId: string;
  paidAmount: number;
  paymentMethod?: string; // Mantido por compatibilidade
  paymentMethodId?: string; // UUID da forma de pagamento (preferido)
  notes?: string;
}
