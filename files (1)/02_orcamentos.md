# Feature: Sistema de Orçamentos com Follow-up

## Visão Geral

Sistema completo de orçamentos com **gestão de follow-up** integrada, permitindo acompanhar todo o ciclo de vida da negociação com o cliente através de histórico de interações, lembretes automáticos e pipeline de vendas.

## Tabelas

### 1. `customers`

Cadastro de clientes com controle de follow-up.

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  document VARCHAR(18),
  document_type VARCHAR(10) CHECK (document_type IN ('cpf', 'cnpj')),
  
  -- Contato
  email VARCHAR(255),
  phone VARCHAR(20),
  mobile VARCHAR(20),
  
  -- Endereço
  address JSONB,
  
  -- Informações comerciais
  customer_type VARCHAR(20) DEFAULT 'individual', -- individual, business
  notes TEXT,
  
  -- Status e Follow-up
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'lead' CHECK (
    status IN ('lead', 'prospect', 'customer', 'inactive')
  ),
  
  -- Lead scoring e priorização
  priority VARCHAR(20) DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  
  -- Origem do lead
  source VARCHAR(50), -- referral, website, social_media, cold_call, etc.
  
  -- Datas importantes
  first_contact_date DATE,
  last_contact_date DATE,
  next_followup_date DATE,
  converted_to_customer_date DATE,
  
  -- Responsável pelo follow-up
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Tags para segmentação
  tags TEXT[], -- Array de tags: ['vip', 'atacado', 'varejo']
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_document ON customers(document);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_priority ON customers(priority);
CREATE INDEX idx_customers_next_followup_date ON customers(next_followup_date);
CREATE INDEX idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX idx_customers_name ON customers USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_customers_tags ON customers USING gin(tags);

COMMENT ON TABLE customers IS 'Cadastro de clientes com gestão de follow-up';
COMMENT ON COLUMN customers.status IS 'lead (potencial), prospect (em negociação), customer (cliente ativo), inactive (inativo)';
COMMENT ON COLUMN customers.priority IS 'Prioridade para follow-up: low, medium, high, urgent';
```

### 2. `customer_interactions`

Histórico de todas as interações com clientes.

```sql
CREATE TABLE customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Tipo de interação
  interaction_type VARCHAR(50) NOT NULL CHECK (
    interaction_type IN (
      'call', 'email', 'whatsapp', 'meeting', 
      'visit', 'quote_sent', 'quote_followup', 
      'negotiation', 'other'
    )
  ),
  
  -- Direção da interação
  direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
  
  -- Detalhes
  subject VARCHAR(255),
  description TEXT NOT NULL,
  
  -- Resultado
  outcome VARCHAR(50), -- successful, unsuccessful, no_answer, rescheduled, etc.
  
  -- Próximo passo
  next_action VARCHAR(255),
  next_action_date DATE,
  
  -- Duração (para calls e meetings, em minutos)
  duration_minutes INTEGER,
  
  -- Anexos/referências
  attachments JSONB DEFAULT '[]', -- URLs de arquivos anexados
  
  -- Relacionamento com orçamento
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  
  -- Responsável
  created_by UUID REFERENCES auth.users(id),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_interactions_company_id ON customer_interactions(company_id);
CREATE INDEX idx_customer_interactions_customer_id ON customer_interactions(customer_id);
CREATE INDEX idx_customer_interactions_budget_id ON customer_interactions(budget_id);
CREATE INDEX idx_customer_interactions_type ON customer_interactions(interaction_type);
CREATE INDEX idx_customer_interactions_created_at ON customer_interactions(created_at DESC);
CREATE INDEX idx_customer_interactions_next_action_date ON customer_interactions(next_action_date);

COMMENT ON TABLE customer_interactions IS 'Histórico de interações com clientes';
COMMENT ON COLUMN customer_interactions.direction IS 'inbound (cliente iniciou), outbound (empresa iniciou)';
```

### 3. `budgets`

Orçamentos com controle de follow-up integrado.

```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Identificação
  budget_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Dados do cliente (desnormalizado)
  customer_name VARCHAR(255),
  customer_document VARCHAR(18),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  
  -- Valores
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted', 'in_negotiation')
  ),
  
  -- Pipeline/Etapa
  pipeline_stage VARCHAR(50) DEFAULT 'initial' CHECK (
    pipeline_stage IN (
      'initial',        -- Orçamento inicial
      'sent',           -- Enviado ao cliente
      'under_review',   -- Cliente analisando
      'negotiating',    -- Em negociação
      'final_review',   -- Revisão final
      'approved',       -- Aprovado
      'lost'            -- Perdido
    )
  ),
  
  -- Probabilidade de fechamento (0-100%)
  win_probability INTEGER DEFAULT 0 CHECK (win_probability >= 0 AND win_probability <= 100),
  
  -- Motivo de rejeição/perda
  rejection_reason VARCHAR(255),
  loss_reason VARCHAR(20) CHECK (
    loss_reason IN ('price', 'competitor', 'timing', 'budget', 'no_interest', 'other')
  ),
  
  -- Datas
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  last_followup_at TIMESTAMPTZ,
  next_followup_date DATE,
  
  -- Follow-up
  followup_count INTEGER DEFAULT 0, -- Quantidade de follow-ups realizados
  days_in_pipeline INTEGER DEFAULT 0, -- Dias no pipeline
  
  -- Observações
  notes TEXT,
  terms TEXT,
  
  -- Responsável
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_budgets_company_id ON budgets(company_id);
CREATE INDEX idx_budgets_customer_id ON budgets(customer_id);
CREATE INDEX idx_budgets_budget_number ON budgets(budget_number);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_pipeline_stage ON budgets(pipeline_stage);
CREATE INDEX idx_budgets_issue_date ON budgets(issue_date DESC);
CREATE INDEX idx_budgets_next_followup_date ON budgets(next_followup_date);
CREATE INDEX idx_budgets_assigned_to ON budgets(assigned_to);
CREATE INDEX idx_budgets_win_probability ON budgets(win_probability);

COMMENT ON TABLE budgets IS 'Orçamentos com controle de pipeline e follow-up';
COMMENT ON COLUMN budgets.pipeline_stage IS 'Etapa do orçamento no funil de vendas';
COMMENT ON COLUMN budgets.win_probability IS 'Probabilidade de fechamento (0-100%)';
```

### 4. `budget_items`

Itens de cada orçamento (sem alterações, mantém a estrutura original).

```sql
CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  product_service_id UUID REFERENCES products_services(id) ON DELETE SET NULL,
  
  -- Dados do item (desnormalizado)
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('product', 'service')),
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Quantidade e valores
  quantity DECIMAL(15, 3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,
  
  -- Ordem de exibição
  sort_order INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX idx_budget_items_product_service_id ON budget_items(product_service_id);

COMMENT ON TABLE budget_items IS 'Itens de cada orçamento';
```

### 5. `followup_tasks`

Tarefas e lembretes de follow-up.

```sql
CREATE TABLE followup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Relacionamentos
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  
  -- Detalhes da tarefa
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Tipo e prioridade
  task_type VARCHAR(50) DEFAULT 'followup' CHECK (
    task_type IN ('followup', 'call', 'email', 'meeting', 'quote_review', 'other')
  ),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  
  -- Datas
  due_date DATE NOT NULL,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')
  ),
  
  -- Resultado
  outcome TEXT,
  
  -- Responsável
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  
  -- Lembretes
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followup_tasks_company_id ON followup_tasks(company_id);
CREATE INDEX idx_followup_tasks_customer_id ON followup_tasks(customer_id);
CREATE INDEX idx_followup_tasks_budget_id ON followup_tasks(budget_id);
CREATE INDEX idx_followup_tasks_assigned_to ON followup_tasks(assigned_to);
CREATE INDEX idx_followup_tasks_due_date ON followup_tasks(due_date);
CREATE INDEX idx_followup_tasks_status ON followup_tasks(status);

COMMENT ON TABLE followup_tasks IS 'Tarefas e lembretes de follow-up';
```

### 6. `budget_status_history`

Histórico de mudanças de status/stage do orçamento.

```sql
CREATE TABLE budget_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  
  -- Mudança de status
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  
  -- Mudança de stage
  old_stage VARCHAR(50),
  new_stage VARCHAR(50),
  
  -- Mudança de probabilidade
  old_probability INTEGER,
  new_probability INTEGER,
  
  -- Observações
  notes TEXT,
  
  -- Responsável pela mudança
  changed_by UUID REFERENCES auth.users(id),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_status_history_budget_id ON budget_status_history(budget_id);
CREATE INDEX idx_budget_status_history_created_at ON budget_status_history(created_at DESC);

COMMENT ON TABLE budget_status_history IS 'Histórico de mudanças de status dos orçamentos';
```

## Triggers e Funções

### Triggers básicos de updated_at

```sql
CREATE TRIGGER update_customers_updated_at 
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_interactions_updated_at 
  BEFORE UPDATE ON customer_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at 
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_items_updated_at 
  BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_followup_tasks_updated_at 
  BEFORE UPDATE ON followup_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Trigger: Atualizar last_contact_date do cliente

```sql
CREATE OR REPLACE FUNCTION update_customer_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET 
    last_contact_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_last_contact
  AFTER INSERT ON customer_interactions
  FOR EACH ROW EXECUTE FUNCTION update_customer_last_contact();

COMMENT ON FUNCTION update_customer_last_contact IS 'Atualiza a data da última interação com o cliente';
```

### Trigger: Registrar histórico de mudanças de status do orçamento

```sql
CREATE OR REPLACE FUNCTION track_budget_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registrar se houve mudança
  IF (OLD.status IS DISTINCT FROM NEW.status) OR 
     (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage) OR
     (OLD.win_probability IS DISTINCT FROM NEW.win_probability) THEN
    
    INSERT INTO budget_status_history (
      budget_id,
      old_status,
      new_status,
      old_stage,
      new_stage,
      old_probability,
      new_probability,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      OLD.pipeline_stage,
      NEW.pipeline_stage,
      OLD.win_probability,
      NEW.win_probability,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_budget_status_changes
  AFTER UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION track_budget_status_changes();

COMMENT ON FUNCTION track_budget_status_changes IS 'Registra histórico de mudanças de status do orçamento';
```

### Trigger: Marcar tarefas vencidas automaticamente

```sql
CREATE OR REPLACE FUNCTION mark_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  WITH updated AS (
    UPDATE followup_tasks
    SET status = 'overdue'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO affected_rows FROM updated;
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_overdue_tasks IS 'Marca tarefas pendentes como vencidas (executar via cron)';
```

### Trigger: Atualizar contador de follow-ups

```sql
CREATE OR REPLACE FUNCTION update_budget_followup_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interaction_type IN ('quote_followup', 'call', 'email', 'meeting') THEN
    UPDATE budgets
    SET 
      followup_count = followup_count + 1,
      last_followup_at = NOW()
    WHERE id = NEW.budget_id
      AND NEW.budget_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budget_followup_count
  AFTER INSERT ON customer_interactions
  FOR EACH ROW EXECUTE FUNCTION update_budget_followup_count();

COMMENT ON FUNCTION update_budget_followup_count IS 'Atualiza contador de follow-ups do orçamento';
```

### Função: Criar interação e tarefa de follow-up

```sql
CREATE OR REPLACE FUNCTION create_interaction_with_followup(
  p_customer_id UUID,
  p_budget_id UUID DEFAULT NULL,
  p_interaction_type VARCHAR DEFAULT 'call',
  p_direction VARCHAR DEFAULT 'outbound',
  p_subject VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_outcome VARCHAR DEFAULT NULL,
  p_next_action VARCHAR DEFAULT NULL,
  p_next_action_date DATE DEFAULT NULL,
  p_create_task BOOLEAN DEFAULT false,
  p_task_priority VARCHAR DEFAULT 'medium'
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_interaction_id UUID;
  v_task_id UUID;
  v_result JSONB;
BEGIN
  -- Buscar company_id do cliente
  SELECT company_id INTO v_company_id
  FROM customers
  WHERE id = p_customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;
  
  -- Criar interação
  INSERT INTO customer_interactions (
    company_id,
    customer_id,
    budget_id,
    interaction_type,
    direction,
    subject,
    description,
    outcome,
    next_action,
    next_action_date,
    created_by
  ) VALUES (
    v_company_id,
    p_customer_id,
    p_budget_id,
    p_interaction_type,
    p_direction,
    p_subject,
    p_description,
    p_outcome,
    p_next_action,
    p_next_action_date,
    auth.uid()
  )
  RETURNING id INTO v_interaction_id;
  
  -- Criar tarefa se solicitado
  IF p_create_task AND p_next_action_date IS NOT NULL THEN
    INSERT INTO followup_tasks (
      company_id,
      customer_id,
      budget_id,
      title,
      description,
      task_type,
      priority,
      due_date,
      assigned_to,
      created_by
    ) VALUES (
      v_company_id,
      p_customer_id,
      p_budget_id,
      COALESCE(p_next_action, 'Follow-up: ' || p_subject),
      p_description,
      'followup',
      p_task_priority,
      p_next_action_date,
      auth.uid(),
      auth.uid()
    )
    RETURNING id INTO v_task_id;
    
    -- Atualizar next_followup_date no cliente
    UPDATE customers
    SET next_followup_date = p_next_action_date
    WHERE id = p_customer_id;
    
    -- Atualizar next_followup_date no orçamento se houver
    IF p_budget_id IS NOT NULL THEN
      UPDATE budgets
      SET next_followup_date = p_next_action_date
      WHERE id = p_budget_id;
    END IF;
  END IF;
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'interaction_id', v_interaction_id,
    'task_id', v_task_id,
    'success', true
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_interaction_with_followup IS 'Cria uma interação e opcionalmente uma tarefa de follow-up';
```

### Função: Avançar orçamento no pipeline

```sql
CREATE OR REPLACE FUNCTION advance_budget_stage(
  p_budget_id UUID,
  p_new_stage VARCHAR,
  p_win_probability INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_stage VARCHAR;
  v_valid_stages VARCHAR[] := ARRAY[
    'initial', 'sent', 'under_review', 'negotiating', 
    'final_review', 'approved', 'lost'
  ];
BEGIN
  -- Validar stage
  IF NOT (p_new_stage = ANY(v_valid_stages)) THEN
    RAISE EXCEPTION 'Stage inválido: %', p_new_stage;
  END IF;
  
  -- Buscar stage atual
  SELECT pipeline_stage INTO v_current_stage
  FROM budgets
  WHERE id = p_budget_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado';
  END IF;
  
  -- Atualizar orçamento
  UPDATE budgets
  SET
    pipeline_stage = p_new_stage,
    win_probability = COALESCE(p_win_probability, 
      CASE p_new_stage
        WHEN 'initial' THEN 10
        WHEN 'sent' THEN 20
        WHEN 'under_review' THEN 40
        WHEN 'negotiating' THEN 60
        WHEN 'final_review' THEN 80
        WHEN 'approved' THEN 100
        WHEN 'lost' THEN 0
        ELSE win_probability
      END
    ),
    status = CASE p_new_stage
      WHEN 'approved' THEN 'approved'
      WHEN 'lost' THEN 'rejected'
      ELSE status
    END,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_budget_id;
  
  -- O histórico será registrado automaticamente pelo trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION advance_budget_stage IS 'Avança o orçamento para uma nova etapa do pipeline';
```

### Função: Obter métricas de follow-up

```sql
CREATE OR REPLACE FUNCTION get_followup_metrics(
  p_company_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH metrics AS (
    SELECT
      -- Tarefas
      COUNT(CASE WHEN ft.status = 'pending' AND ft.due_date = CURRENT_DATE THEN 1 END) AS tasks_today,
      COUNT(CASE WHEN ft.status = 'overdue' THEN 1 END) AS tasks_overdue,
      COUNT(CASE WHEN ft.status = 'pending' THEN 1 END) AS tasks_pending,
      
      -- Clientes
      COUNT(DISTINCT CASE WHEN c.next_followup_date = CURRENT_DATE THEN c.id END) AS customers_followup_today,
      COUNT(DISTINCT CASE WHEN c.next_followup_date < CURRENT_DATE AND c.next_followup_date IS NOT NULL THEN c.id END) AS customers_overdue,
      
      -- Orçamentos
      COUNT(DISTINCT CASE WHEN b.next_followup_date = CURRENT_DATE THEN b.id END) AS budgets_followup_today,
      COUNT(DISTINCT CASE WHEN b.pipeline_stage IN ('sent', 'under_review', 'negotiating') THEN b.id END) AS budgets_active,
      
      -- Conversão
      AVG(CASE WHEN b.status = 'converted' THEN b.followup_count END) AS avg_followups_to_convert
      
    FROM companies comp
    LEFT JOIN followup_tasks ft ON ft.company_id = comp.id
      AND (p_user_id IS NULL OR ft.assigned_to = p_user_id)
    LEFT JOIN customers c ON c.company_id = comp.id
      AND (p_user_id IS NULL OR c.assigned_to = p_user_id)
    LEFT JOIN budgets b ON b.company_id = comp.id
      AND (p_user_id IS NULL OR b.assigned_to = p_user_id)
    WHERE comp.id = p_company_id
  )
  SELECT jsonb_build_object(
    'tasks_today', COALESCE(tasks_today, 0),
    'tasks_overdue', COALESCE(tasks_overdue, 0),
    'tasks_pending', COALESCE(tasks_pending, 0),
    'customers_followup_today', COALESCE(customers_followup_today, 0),
    'customers_overdue', COALESCE(customers_overdue, 0),
    'budgets_followup_today', COALESCE(budgets_followup_today, 0),
    'budgets_active', COALESCE(budgets_active, 0),
    'avg_followups_to_convert', ROUND(COALESCE(avg_followups_to_convert, 0)::NUMERIC, 1)
  ) INTO v_result
  FROM metrics;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_followup_metrics IS 'Retorna métricas de follow-up para dashboard';
```

## Views Úteis

### View: Clientes com follow-up pendente

```sql
CREATE OR REPLACE VIEW vw_customers_followup_pending AS
SELECT
  c.id,
  c.company_id,
  c.name,
  c.email,
  c.mobile,
  c.status,
  c.priority,
  c.next_followup_date,
  c.last_contact_date,
  c.assigned_to,
  u.email AS assigned_to_email,
  CURRENT_DATE - c.last_contact_date AS days_since_last_contact,
  CASE
    WHEN c.next_followup_date < CURRENT_DATE THEN 'overdue'
    WHEN c.next_followup_date = CURRENT_DATE THEN 'today'
    WHEN c.next_followup_date > CURRENT_DATE THEN 'upcoming'
    ELSE 'no_schedule'
  END AS followup_status,
  COUNT(DISTINCT ft.id) AS pending_tasks_count
FROM customers c
LEFT JOIN auth.users u ON c.assigned_to = u.id
LEFT JOIN followup_tasks ft ON c.id = ft.customer_id AND ft.status = 'pending'
WHERE c.deleted_at IS NULL
  AND c.is_active = true
  AND c.next_followup_date IS NOT NULL
GROUP BY c.id, u.email;

COMMENT ON VIEW vw_customers_followup_pending IS 'Clientes com follow-up agendado';
```

### View: Pipeline de orçamentos

```sql
CREATE OR REPLACE VIEW vw_budget_pipeline AS
SELECT
  b.id,
  b.company_id,
  b.budget_number,
  b.customer_name,
  b.total_amount,
  b.status,
  b.pipeline_stage,
  b.win_probability,
  b.followup_count,
  b.next_followup_date,
  b.issue_date,
  b.assigned_to,
  u.email AS assigned_to_email,
  c.name AS customer_full_name,
  c.priority AS customer_priority,
  CURRENT_DATE - b.issue_date AS days_in_pipeline,
  CASE
    WHEN b.next_followup_date < CURRENT_DATE THEN 'overdue'
    WHEN b.next_followup_date = CURRENT_DATE THEN 'today'
    WHEN b.next_followup_date > CURRENT_DATE THEN 'upcoming'
    ELSE 'no_schedule'
  END AS followup_status,
  COUNT(DISTINCT ci.id) AS interactions_count,
  MAX(ci.created_at) AS last_interaction_at
FROM budgets b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN auth.users u ON b.assigned_to = u.id
LEFT JOIN customer_interactions ci ON b.id = ci.budget_id
WHERE b.deleted_at IS NULL
  AND b.status NOT IN ('converted', 'rejected', 'expired')
GROUP BY b.id, c.name, c.priority, u.email;

COMMENT ON VIEW vw_budget_pipeline IS 'Visão do pipeline de orçamentos ativos';
```

### View: Histórico de interações com timeline

```sql
CREATE OR REPLACE VIEW vw_customer_timeline AS
SELECT
  ci.id,
  ci.company_id,
  ci.customer_id,
  c.name AS customer_name,
  ci.interaction_type,
  ci.direction,
  ci.subject,
  ci.description,
  ci.outcome,
  ci.next_action,
  ci.next_action_date,
  ci.budget_id,
  b.budget_number,
  ci.created_by,
  u.email AS created_by_email,
  ci.created_at,
  'interaction' AS event_type
FROM customer_interactions ci
LEFT JOIN customers c ON ci.customer_id = c.id
LEFT JOIN budgets b ON ci.budget_id = b.id
LEFT JOIN auth.users u ON ci.created_by = u.id

UNION ALL

SELECT
  bsh.id,
  b.company_id,
  b.customer_id,
  c.name AS customer_name,
  'status_change' AS interaction_type,
  NULL AS direction,
  'Status: ' || bsh.old_status || ' → ' || bsh.new_status AS subject,
  bsh.notes AS description,
  NULL AS outcome,
  NULL AS next_action,
  NULL AS next_action_date,
  bsh.budget_id,
  b.budget_number,
  bsh.changed_by AS created_by,
  u.email AS created_by_email,
  bsh.created_at,
  'status_change' AS event_type
FROM budget_status_history bsh
JOIN budgets b ON bsh.budget_id = b.id
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN auth.users u ON bsh.changed_by = u.id

ORDER BY created_at DESC;

COMMENT ON VIEW vw_customer_timeline IS 'Timeline completa de eventos do cliente (interações + mudanças de status)';
```

### View: Tarefas de hoje e atrasadas

```sql
CREATE OR REPLACE VIEW vw_my_tasks AS
SELECT
  ft.id,
  ft.company_id,
  ft.title,
  ft.description,
  ft.task_type,
  ft.priority,
  ft.due_date,
  ft.due_time,
  ft.status,
  ft.customer_id,
  c.name AS customer_name,
  c.priority AS customer_priority,
  ft.budget_id,
  b.budget_number,
  b.total_amount AS budget_amount,
  ft.assigned_to,
  CASE
    WHEN ft.due_date < CURRENT_DATE THEN 'overdue'
    WHEN ft.due_date = CURRENT_DATE THEN 'today'
    ELSE 'upcoming'
  END AS urgency,
  CURRENT_DATE - ft.due_date AS days_overdue
FROM followup_tasks ft
LEFT JOIN customers c ON ft.customer_id = c.id
LEFT JOIN budgets b ON ft.budget_id = b.id
WHERE ft.status IN ('pending', 'in_progress', 'overdue')
ORDER BY
  CASE ft.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  ft.due_date;

COMMENT ON VIEW vw_my_tasks IS 'Tarefas pendentes ordenadas por prioridade e data';
```

## Row Level Security (RLS)

```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas para customers
CREATE POLICY "Users can view customers of their companies"
  ON customers FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert customers to their companies"
  ON customers FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update customers of their companies"
  ON customers FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete customers of their companies"
  ON customers FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Políticas para customer_interactions
CREATE POLICY "Users can view interactions of their companies"
  ON customer_interactions FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert interactions to their companies"
  ON customer_interactions FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Políticas para budgets (similar ao anterior, mas com campos adicionais)
CREATE POLICY "Users can view budgets of their companies"
  ON budgets FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert budgets to their companies"
  ON budgets FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update budgets of their companies"
  ON budgets FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Políticas para followup_tasks
CREATE POLICY "Users can view tasks of their companies"
  ON followup_tasks FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert tasks to their companies"
  ON followup_tasks FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update tasks of their companies"
  ON followup_tasks FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Políticas para budget_status_history (somente leitura)
CREATE POLICY "Users can view status history of their companies"
  ON budget_status_history FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );
```

## Exemplos de Uso

### 1. Cadastrar Cliente com Follow-up

```sql
INSERT INTO customers (
  company_id,
  name,
  email,
  mobile,
  status,
  priority,
  source,
  first_contact_date,
  next_followup_date,
  assigned_to,
  tags
) VALUES (
  'company-uuid',
  'Maria Silva',
  'maria@email.com',
  '(11) 98888-7777',
  'lead',
  'high',
  'website',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '3 days',
  auth.uid(),
  ARRAY['atacado', 'novo_lead']
);
```

### 2. Registrar Interação e Criar Tarefa de Follow-up

```sql
SELECT create_interaction_with_followup(
  p_customer_id := 'customer-uuid',
  p_budget_id := 'budget-uuid',
  p_interaction_type := 'call',
  p_direction := 'outbound',
  p_subject := 'Apresentação do orçamento',
  p_description := 'Liguei para apresentar o orçamento. Cliente demonstrou interesse mas pediu para pensar. Mencionou que vai decidir até sexta-feira.',
  p_outcome := 'successful',
  p_next_action := 'Ligar novamente para confirmar decisão',
  p_next_action_date := CURRENT_DATE + INTERVAL '3 days',
  p_create_task := true,
  p_task_priority := 'high'
);
```

### 3. Criar Orçamento com Pipeline

```sql
-- Criar orçamento
INSERT INTO budgets (
  company_id,
  customer_id,
  budget_number,
  customer_name,
  pipeline_stage,
  win_probability,
  next_followup_date,
  assigned_to,
  created_by
) VALUES (
  'company-uuid',
  'customer-uuid',
  generate_budget_number('company-uuid'),
  'Maria Silva',
  'initial',
  10,
  CURRENT_DATE + INTERVAL '2 days',
  auth.uid(),
  auth.uid()
)
RETURNING id;

-- Adicionar itens...
-- (mesmo processo de antes)
```

### 4. Avançar Orçamento no Pipeline

```sql
-- Orçamento foi enviado
SELECT advance_budget_stage(
  'budget-uuid',
  'sent',
  20, -- 20% de probabilidade
  'Orçamento enviado por email em ' || CURRENT_DATE
);

-- Cliente está analisando
SELECT advance_budget_stage(
  'budget-uuid',
  'under_review',
  40,
  'Cliente confirmou recebimento e está analisando'
);

-- Em negociação
SELECT advance_budget_stage(
  'budget-uuid',
  'negotiating',
  60,
  'Cliente pediu desconto de 10%. Ajustamos para 5%.'
);

-- Aprovado!
SELECT advance_budget_stage(
  'budget-uuid',
  'approved',
  100,
  'Cliente aprovou o orçamento!'
);
```

### 5. Listar Tarefas de Hoje

```sql
SELECT
  id,
  title,
  customer_name,
  budget_number,
  priority,
  due_time,
  urgency
FROM vw_my_tasks
WHERE assigned_to = auth.uid()
  AND due_date = CURRENT_DATE
ORDER BY
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  due_time NULLS LAST;
```

### 6. Dashboard de Follow-up

```sql
SELECT get_followup_metrics(
  'company-uuid',
  auth.uid() -- ou NULL para ver de todos os usuários
);

-- Retorna:
{
  "tasks_today": 5,
  "tasks_overdue": 2,
  "tasks_pending": 12,
  "customers_followup_today": 3,
  "customers_overdue": 1,
  "budgets_followup_today": 4,
  "budgets_active": 15,
  "avg_followups_to_convert": 4.2
}
```

### 7. Visualizar Pipeline de Vendas

```sql
SELECT
  pipeline_stage,
  COUNT(*) AS total_budgets,
  SUM(total_amount) AS total_value,
  AVG(win_probability) AS avg_probability,
  SUM(total_amount * win_probability / 100) AS weighted_value
FROM budgets
WHERE company_id = 'company-uuid'
  AND status NOT IN ('converted', 'rejected', 'expired')
  AND deleted_at IS NULL
GROUP BY pipeline_stage
ORDER BY
  CASE pipeline_stage
    WHEN 'initial' THEN 1
    WHEN 'sent' THEN 2
    WHEN 'under_review' THEN 3
    WHEN 'negotiating' THEN 4
    WHEN 'final_review' THEN 5
    WHEN 'approved' THEN 6
    WHEN 'lost' THEN 7
  END;
```

### 8. Timeline Completa do Cliente

```sql
SELECT
  event_type,
  subject,
  description,
  created_at,
  created_by_email
FROM vw_customer_timeline
WHERE customer_id = 'customer-uuid'
ORDER BY created_at DESC
LIMIT 50;
```

### 9. Relatório de Conversão

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'converted') AS converted,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE status IN ('sent', 'in_negotiation')) AS in_progress,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC / 
    NULLIF(COUNT(*)::NUMERIC, 0) * 100, 
    2
  ) AS conversion_rate,
  AVG(followup_count) FILTER (WHERE status = 'converted') AS avg_followups_won,
  AVG(days_in_pipeline) FILTER (WHERE status = 'converted') AS avg_days_to_close
FROM budgets
WHERE company_id = 'company-uuid'
  AND issue_date >= CURRENT_DATE - INTERVAL '90 days'
  AND deleted_at IS NULL;
```

### 10. Completar Tarefa de Follow-up

```sql
UPDATE followup_tasks
SET
  status = 'completed',
  completed_at = NOW(),
  outcome = 'Cliente confirmou interesse. Agendada reunião para apresentação detalhada.'
WHERE id = 'task-uuid'
  AND assigned_to = auth.uid();
```

## Notificações e Lembretes

### Query para lembretes diários (executar via cron)

```sql
-- Buscar tarefas que precisam de lembrete
SELECT
  ft.id,
  ft.title,
  ft.due_date,
  ft.due_time,
  u.email AS user_email,
  c.name AS customer_name,
  b.budget_number
FROM followup_tasks ft
JOIN auth.users u ON ft.assigned_to = u.id
LEFT JOIN customers c ON ft.customer_id = c.id
LEFT JOIN budgets b ON ft.budget_id = b.id
WHERE ft.status = 'pending'
  AND ft.due_date = CURRENT_DATE
  AND ft.reminder_sent = false
ORDER BY
  CASE ft.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  ft.due_time NULLS LAST;

-- Após enviar lembrete, marcar como enviado
UPDATE followup_tasks
SET
  reminder_sent = true,
  reminder_sent_at = NOW()
WHERE id = 'task-uuid';
```

## Considerações de Implementação

### 1. Automação de Follow-ups

Configure jobs agendados (cron) para:

- **Diariamente às 8h:** Marcar tarefas vencidas (`mark_overdue_tasks()`)
- **Diariamente às 9h:** Enviar lembretes de tarefas do dia
- **Semanalmente:** Identificar clientes sem interação há mais de 30 dias

### 2. Notificações

Implemente notificações para:
- Tarefas vencendo hoje
- Orçamentos sem follow-up há X dias
- Mudanças de status importantes
- Novos orçamentos atribuídos

### 3. Integrações

#### WhatsApp

```sql
-- Registrar mensagem de WhatsApp como interação
SELECT create_interaction_with_followup(
  p_customer_id := 'customer-uuid',
  p_interaction_type := 'whatsapp',
  p_direction := 'outbound',
  p_subject := 'Follow-up orçamento',
  p_description := 'Enviei mensagem via WhatsApp confirmando recebimento'
);
```

#### Email

```sql
-- Registrar email enviado
INSERT INTO customer_interactions (
  company_id, customer_id, budget_id,
  interaction_type, direction,
  subject, description,
  created_by
) VALUES (
  'company-uuid', 'customer-uuid', 'budget-uuid',
  'email', 'outbound',
  'Orçamento #ORC-2026-000123',
  'Email enviado com orçamento em anexo',
  auth.uid()
);
```

### 4. Tags e Segmentação

Use tags para segmentar clientes:

```sql
-- Buscar clientes VIP com follow-up hoje
SELECT * FROM customers
WHERE 'vip' = ANY(tags)
  AND next_followup_date = CURRENT_DATE;

-- Buscar leads de origem específica
SELECT * FROM customers
WHERE source = 'website'
  AND status = 'lead'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';
```

### 5. Análise de Performance

```sql
-- Vendedores com melhor taxa de conversão
SELECT
  u.email AS vendedor,
  COUNT(*) FILTER (WHERE b.status = 'converted') AS vendas,
  COUNT(*) AS total_orcamentos,
  ROUND(
    COUNT(*) FILTER (WHERE b.status = 'converted')::NUMERIC / 
    NULLIF(COUNT(*)::NUMERIC, 0) * 100,
    2
  ) AS taxa_conversao,
  AVG(b.followup_count) FILTER (WHERE b.status = 'converted') AS media_followups
FROM budgets b
JOIN auth.users u ON b.assigned_to = u.id
WHERE b.company_id = 'company-uuid'
  AND b.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY u.id, u.email
ORDER BY taxa_conversao DESC;
```

---

**Relacionado:**
- [01 - Produtos e Serviços](./01_produtos_servicos.md)
- [03 - PDV (Ponto de Venda)](./03_pdv.md)
