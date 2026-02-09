// Types para o sistema de Orçamentos

export interface Budget {
  id: string;
  company_id: string;
  customer_id?: string;
  budget_number: string;
  share_token?: string;
  customer_name?: string;
  customer_document?: string;
  customer_email?: string;
  customer_phone?: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted' | 'in_negotiation';
  pipeline_stage: 'initial' | 'sent' | 'under_review' | 'negotiating' | 'final_review' | 'approved' | 'lost';
  win_probability: number;
  rejection_reason?: string;
  loss_reason?: 'price' | 'competitor' | 'timing' | 'budget' | 'no_interest' | 'other';
  issue_date: string;
  expiry_date?: string;
  sent_at?: string;
  approved_at?: string;
  rejected_at?: string;
  converted_at?: string;
  last_followup_at?: string;
  next_followup_date?: string;
  followup_count: number;
  days_in_pipeline: number;
  notes?: string;
  terms?: string;
  assigned_to?: string;
  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
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
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetRequest {
  companyId: string;
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  customerEmail?: string;
  customerPhone?: string;
  discountAmount?: number;
  discountPercentage?: number;
  taxAmount?: number;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  terms?: string;
  assignedTo?: string;
  items: CreateBudgetItemRequest[];
}

export interface CreateBudgetItemRequest {
  productServiceId: string; // Obrigatório: busca name, sku, itemType, etc. do banco
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
  sortOrder?: number;
}

export interface UpdateBudgetRequest {
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  customerEmail?: string;
  customerPhone?: string;
  discountAmount?: number;
  discountPercentage?: number;
  taxAmount?: number;
  status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted' | 'in_negotiation';
  pipelineStage?: 'initial' | 'sent' | 'under_review' | 'negotiating' | 'final_review' | 'approved' | 'lost';
  winProbability?: number;
  rejectionReason?: string;
  lossReason?: 'price' | 'competitor' | 'timing' | 'budget' | 'no_interest' | 'other';
  issueDate?: string;
  expiryDate?: string;
  nextFollowupDate?: string;
  notes?: string;
  terms?: string;
  assignedTo?: string;
  items?: CreateBudgetItemRequest[];
}

export interface BudgetStatusHistory {
  id: string;
  budget_id: string;
  old_status?: string;
  new_status: string;
  old_stage?: string;
  new_stage?: string;
  old_probability?: number;
  new_probability?: number;
  notes?: string;
  changed_by?: string;
  created_at: string;
}

export interface FollowupTask {
  id: string;
  company_id: string;
  customer_id?: string;
  budget_id?: string;
  title: string;
  description?: string;
  task_type: 'followup' | 'call' | 'email' | 'meeting' | 'quote_review' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  due_time?: string;
  completed_at?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  outcome?: string;
  assigned_to: string;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFollowupTaskRequest {
  companyId: string;
  customerId?: string;
  budgetId?: string;
  title: string;
  description?: string;
  taskType?: 'followup' | 'call' | 'email' | 'meeting' | 'quote_review' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  dueTime?: string;
  assignedTo: string;
}

export interface UpdateFollowupTaskRequest {
  title?: string;
  description?: string;
  taskType?: 'followup' | 'call' | 'email' | 'meeting' | 'quote_review' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  dueTime?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  outcome?: string;
  assignedTo?: string;
}
