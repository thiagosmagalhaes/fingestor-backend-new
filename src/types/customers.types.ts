// Types para o sistema de Clientes e Orçamentos

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  document?: string;
  document_type?: 'cpf' | 'cnpj';
  email?: string;
  phone?: string;
  mobile?: string;
  address?: Record<string, any>;
  customer_type: string;
  notes?: string;
  is_active: boolean;
  status: 'lead' | 'prospect' | 'customer' | 'inactive';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  first_contact_date?: string;
  last_contact_date?: string;
  next_followup_date?: string;
  converted_to_customer_date?: string;
  assigned_to?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateCustomerRequest {
  companyId: string;
  name: string;
  document?: string;
  documentType?: 'cpf' | 'cnpj';
  email?: string;
  phone?: string;
  mobile?: string;
  address?: Record<string, any>;
  customerType?: string;
  notes?: string;
  status?: 'lead' | 'prospect' | 'customer' | 'inactive';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  assignedTo?: string;
  tags?: string[];
}

export interface UpdateCustomerRequest {
  name?: string;
  document?: string;
  documentType?: 'cpf' | 'cnpj';
  email?: string;
  phone?: string;
  mobile?: string;
  address?: Record<string, any>;
  customerType?: string;
  notes?: string;
  isActive?: boolean;
  status?: 'lead' | 'prospect' | 'customer' | 'inactive';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  source?: string;
  nextFollowupDate?: string;
  assignedTo?: string;
  tags?: string[];
}

export interface CustomerInteraction {
  id: string;
  company_id: string;
  customer_id: string;
  interaction_type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'visit' | 'quote_sent' | 'quote_followup' | 'negotiation' | 'other';
  direction?: 'inbound' | 'outbound';
  subject?: string;
  description: string;
  outcome?: string;
  next_action?: string;
  next_action_date?: string;
  duration_minutes?: number;
  attachments?: string[];
  budget_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInteractionRequest {
  companyId: string;
  customerId: string;
  interactionType: 'call' | 'email' | 'whatsapp' | 'meeting' | 'visit' | 'quote_sent' | 'quote_followup' | 'negotiation' | 'other';
  direction?: 'inbound' | 'outbound';
  subject?: string;
  description: string;
  outcome?: string;
  nextAction?: string;
  nextActionDate?: string;
  durationMinutes?: number;
  attachments?: string[];
  budgetId?: string;
}
