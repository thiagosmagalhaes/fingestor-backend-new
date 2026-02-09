-- ================================================================
-- MIGRATIONS - SISTEMA DE PRODUTOS, ORÇAMENTOS E PDV
-- Versão: 1.0.0
-- Data: 2026-02-07
-- Plataforma: Supabase (PostgreSQL)
-- ================================================================

BEGIN;

-- ================================================================
-- FEATURE 1: PRODUTOS E SERVIÇOS
-- ================================================================

-- Tabela: product_categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  category_type VARCHAR(20) CHECK (category_type IN ('product', 'service', 'both')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX idx_product_categories_company_id ON product_categories(company_id);
CREATE INDEX idx_product_categories_parent_id ON product_categories(parent_id);

COMMENT ON TABLE product_categories IS 'Categorias de produtos e serviços';

-- Tabela: products_services
CREATE TABLE IF NOT EXISTS products_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('product', 'service')),
  cost_price DECIMAL(15, 2),
  sale_price DECIMAL(15, 2) NOT NULL,
  track_inventory BOOLEAN DEFAULT false,
  current_stock DECIMAL(15, 3) DEFAULT 0,
  min_stock DECIMAL(15, 3) DEFAULT 0,
  stock_unit VARCHAR(20) DEFAULT 'un',
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  commission_percentage DECIMAL(5, 2) DEFAULT 0,
  images JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, sku)
);

CREATE INDEX idx_products_services_company_id ON products_services(company_id);
CREATE INDEX idx_products_services_category_id ON products_services(category_id);
CREATE INDEX idx_products_services_sku ON products_services(sku);
CREATE INDEX idx_products_services_barcode ON products_services(barcode);
CREATE INDEX idx_products_services_item_type ON products_services(item_type);
CREATE INDEX idx_products_services_is_active ON products_services(is_active);
CREATE INDEX idx_products_services_name ON products_services USING gin(to_tsvector('portuguese', name));

COMMENT ON TABLE products_services IS 'Cadastro unificado de produtos e serviços';

-- Tabela: inventory_movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_service_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (
    movement_type IN ('purchase', 'sale', 'adjustment', 'return', 'transfer', 'loss')
  ),
  quantity DECIMAL(15, 3) NOT NULL,
  previous_stock DECIMAL(15, 3) NOT NULL,
  new_stock DECIMAL(15, 3) NOT NULL,
  sale_id UUID,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_movements_company_id ON inventory_movements(company_id);
CREATE INDEX idx_inventory_movements_product_service_id ON inventory_movements(product_service_id);
CREATE INDEX idx_inventory_movements_movement_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at DESC);

COMMENT ON TABLE inventory_movements IS 'Histórico de movimentações de estoque';

-- ================================================================
-- FEATURE 2: ORÇAMENTOS COM FOLLOW-UP
-- ================================================================

-- Tabela: customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  document VARCHAR(18),
  document_type VARCHAR(10) CHECK (document_type IN ('cpf', 'cnpj')),
  email VARCHAR(255),
  phone VARCHAR(20),
  mobile VARCHAR(20),
  address JSONB,
  customer_type VARCHAR(20) DEFAULT 'individual',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'lead' CHECK (
    status IN ('lead', 'prospect', 'customer', 'inactive')
  ),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  source VARCHAR(50),
  first_contact_date DATE,
  last_contact_date DATE,
  next_followup_date DATE,
  converted_to_customer_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  tags TEXT[],
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

-- Tabela: customer_interactions
CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL CHECK (
    interaction_type IN (
      'call', 'email', 'whatsapp', 'meeting', 
      'visit', 'quote_sent', 'quote_followup', 
      'negotiation', 'other'
    )
  ),
  direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
  subject VARCHAR(255),
  description TEXT NOT NULL,
  outcome VARCHAR(50),
  next_action VARCHAR(255),
  next_action_date DATE,
  duration_minutes INTEGER,
  attachments JSONB DEFAULT '[]',
  budget_id UUID,
  created_by UUID REFERENCES auth.users(id),
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

-- Tabela: budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  budget_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255),
  customer_document VARCHAR(18),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted', 'in_negotiation')
  ),
  pipeline_stage VARCHAR(50) DEFAULT 'initial' CHECK (
    pipeline_stage IN (
      'initial', 'sent', 'under_review', 'negotiating', 
      'final_review', 'approved', 'lost'
    )
  ),
  win_probability INTEGER DEFAULT 0 CHECK (win_probability >= 0 AND win_probability <= 100),
  rejection_reason VARCHAR(255),
  loss_reason VARCHAR(20) CHECK (
    loss_reason IN ('price', 'competitor', 'timing', 'budget', 'no_interest', 'other')
  ),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  last_followup_at TIMESTAMPTZ,
  next_followup_date DATE,
  followup_count INTEGER DEFAULT 0,
  days_in_pipeline INTEGER DEFAULT 0,
  notes TEXT,
  terms TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
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

-- Tabela: budget_items
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  product_service_id UUID REFERENCES products_services(id) ON DELETE SET NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('product', 'service')),
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(15, 3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX idx_budget_items_product_service_id ON budget_items(product_service_id);

COMMENT ON TABLE budget_items IS 'Itens de cada orçamento';

-- Tabela: followup_tasks
CREATE TABLE IF NOT EXISTS followup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) DEFAULT 'followup' CHECK (
    task_type IN ('followup', 'call', 'email', 'meeting', 'quote_review', 'other')
  ),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  due_date DATE NOT NULL,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')
  ),
  outcome TEXT,
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
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

-- Tabela: budget_status_history
CREATE TABLE IF NOT EXISTS budget_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  old_stage VARCHAR(50),
  new_stage VARCHAR(50),
  old_probability INTEGER,
  new_probability INTEGER,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_status_history_budget_id ON budget_status_history(budget_id);
CREATE INDEX idx_budget_status_history_created_at ON budget_status_history(created_at DESC);

COMMENT ON TABLE budget_status_history IS 'Histórico de mudanças de status dos orçamentos';

-- ================================================================
-- FEATURE 3: PDV (PONTO DE VENDA)
-- ================================================================

-- Tabela: sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  sale_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255),
  customer_document VARCHAR(18),
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'paid', 'partial', 'cancelled', 'refunded')
  ),
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  change_amount DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed' CHECK (
    status IN ('draft', 'completed', 'cancelled', 'refunded')
  ),
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  notes TEXT,
  cancellation_reason TEXT,
  nfce_number VARCHAR(50),
  nfce_key VARCHAR(44),
  nfce_status VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sales_company_id ON sales(company_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_budget_id ON sales(budget_id);
CREATE INDEX idx_sales_sale_number ON sales(sale_number);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_payment_status ON sales(payment_status);
CREATE INDEX idx_sales_sale_date ON sales(sale_date DESC);
CREATE INDEX idx_sales_created_by ON sales(created_by);

COMMENT ON TABLE sales IS 'Vendas realizadas no PDV';

-- Tabela: sale_items
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_service_id UUID REFERENCES products_services(id) ON DELETE SET NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('product', 'service')),
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(15, 3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,
  cost_price DECIMAL(15, 2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_service_id ON sale_items(product_service_id);

COMMENT ON TABLE sale_items IS 'Itens de cada venda';

-- Tabela: payment_installments
CREATE TABLE IF NOT EXISTS payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'overdue', 'cancelled')
  ),
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sale_id, installment_number)
);

CREATE INDEX idx_payment_installments_sale_id ON payment_installments(sale_id);
CREATE INDEX idx_payment_installments_due_date ON payment_installments(due_date);
CREATE INDEX idx_payment_installments_status ON payment_installments(status);

COMMENT ON TABLE payment_installments IS 'Parcelas de vendas parceladas';

-- Adicionar foreign key de sale_id em inventory_movements
ALTER TABLE inventory_movements
DROP CONSTRAINT IF EXISTS inventory_movements_sale_id_fkey;

ALTER TABLE inventory_movements
ADD CONSTRAINT inventory_movements_sale_id_fkey
FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;

-- Adicionar foreign key de budget_id em customer_interactions
ALTER TABLE customer_interactions
DROP CONSTRAINT IF EXISTS customer_interactions_budget_id_fkey;

ALTER TABLE customer_interactions
ADD CONSTRAINT customer_interactions_budget_id_fkey
FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE SET NULL;

-- ================================================================
-- FUNÇÕES E TRIGGERS
-- ================================================================

-- Função: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER update_product_categories_updated_at 
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_services_updated_at 
  BEFORE UPDATE ON products_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_sales_updated_at 
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_items_updated_at 
  BEFORE UPDATE ON sale_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_installments_updated_at 
  BEFORE UPDATE ON payment_installments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função: generate_budget_number
CREATE OR REPLACE FUNCTION generate_budget_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  year_suffix VARCHAR(4);
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(budget_number FROM '\d+$') AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM budgets
  WHERE company_id = p_company_id
    AND budget_number LIKE 'ORC-' || year_suffix || '-%'
    AND deleted_at IS NULL;
  
  RETURN 'ORC-' || year_suffix || '-' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Função: generate_sale_number
CREATE OR REPLACE FUNCTION generate_sale_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  date_suffix VARCHAR(8);
BEGIN
  date_suffix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(sale_number FROM '\d+$') AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM sales
  WHERE company_id = p_company_id
    AND sale_number LIKE 'VND-' || date_suffix || '-%'
    AND deleted_at IS NULL;
  
  RETURN 'VND-' || date_suffix || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Função: calculate_budget_totals
CREATE OR REPLACE FUNCTION calculate_budget_totals()
RETURNS TRIGGER AS $$
DECLARE
  budget_discount DECIMAL(15, 2);
  budget_discount_pct DECIMAL(5, 2);
BEGIN
  SELECT discount_amount, discount_percentage 
  INTO budget_discount, budget_discount_pct
  FROM budgets
  WHERE id = COALESCE(NEW.budget_id, OLD.budget_id);
  
  WITH items_sum AS (
    SELECT COALESCE(SUM(total_amount), 0) as subtotal
    FROM budget_items
    WHERE budget_id = COALESCE(NEW.budget_id, OLD.budget_id)
  )
  UPDATE budgets b
  SET
    subtotal = items_sum.subtotal,
    total_amount = CASE
      WHEN budget_discount_pct > 0 THEN
        items_sum.subtotal - (items_sum.subtotal * budget_discount_pct / 100)
      ELSE
        items_sum.subtotal - COALESCE(budget_discount, 0)
    END
  FROM items_sum
  WHERE b.id = COALESCE(NEW.budget_id, OLD.budget_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_budget_totals
  AFTER INSERT OR UPDATE OR DELETE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION calculate_budget_totals();

-- Função: calculate_sale_totals
CREATE OR REPLACE FUNCTION calculate_sale_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_discount DECIMAL(15, 2);
  v_sale_discount_pct DECIMAL(5, 2);
BEGIN
  SELECT discount_amount, discount_percentage 
  INTO v_sale_discount, v_sale_discount_pct
  FROM sales
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  WITH items_sum AS (
    SELECT COALESCE(SUM(total_amount), 0) as subtotal
    FROM sale_items
    WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
  )
  UPDATE sales s
  SET
    subtotal = items_sum.subtotal,
    total_amount = CASE
      WHEN v_sale_discount_pct > 0 THEN
        items_sum.subtotal - (items_sum.subtotal * v_sale_discount_pct / 100)
      ELSE
        items_sum.subtotal - COALESCE(v_sale_discount, 0)
    END
  FROM items_sum
  WHERE s.id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_sale_totals
  AFTER INSERT OR UPDATE OR DELETE ON sale_items
  FOR EACH ROW EXECUTE FUNCTION calculate_sale_totals();

-- Função: update_inventory_on_sale
CREATE OR REPLACE FUNCTION update_inventory_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_product RECORD;
  v_sale_company_id UUID;
BEGIN
  SELECT company_id INTO v_sale_company_id
  FROM sales
  WHERE id = NEW.sale_id;
  
  SELECT * INTO v_product
  FROM products_services
  WHERE id = NEW.product_service_id;
  
  IF v_product.item_type = 'product' AND v_product.track_inventory THEN
    IF v_product.current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para %. Disponível: %, Solicitado: %',
        v_product.name, v_product.current_stock, NEW.quantity;
    END IF;
    
    UPDATE products_services
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_service_id;
    
    INSERT INTO inventory_movements (
      company_id, product_service_id, movement_type,
      quantity, previous_stock, new_stock, sale_id, notes, created_by
    ) VALUES (
      v_sale_company_id, NEW.product_service_id, 'sale',
      -NEW.quantity, v_product.current_stock, v_product.current_stock - NEW.quantity,
      NEW.sale_id, 'Venda automática', auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_on_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_sale();

-- Função: add_product_stock
CREATE OR REPLACE FUNCTION add_product_stock(
  p_product_id UUID,
  p_quantity DECIMAL,
  p_reference_number VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_product RECORD;
BEGIN
  SELECT * INTO v_product
  FROM products_services
  WHERE id = p_product_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  
  IF v_product.item_type != 'product' OR NOT v_product.track_inventory THEN
    RAISE EXCEPTION 'Produto não controla estoque';
  END IF;
  
  UPDATE products_services
  SET current_stock = current_stock + p_quantity
  WHERE id = p_product_id;
  
  INSERT INTO inventory_movements (
    company_id, product_service_id, movement_type,
    quantity, previous_stock, new_stock,
    reference_number, notes, created_by
  ) VALUES (
    v_product.company_id, p_product_id, 'purchase',
    p_quantity, v_product.current_stock, v_product.current_stock + p_quantity,
    p_reference_number, p_notes, auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: cancel_sale
CREATE OR REPLACE FUNCTION cancel_sale(
  p_sale_id UUID,
  p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
  v_sale RECORD;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF v_sale.status = 'cancelled' THEN RAISE EXCEPTION 'Venda já cancelada'; END IF;
  
  UPDATE products_services ps
  SET current_stock = current_stock + si.quantity
  FROM sale_items si
  WHERE si.sale_id = p_sale_id
    AND si.product_service_id = ps.id
    AND ps.track_inventory = true;
  
  INSERT INTO inventory_movements (
    company_id, product_service_id, movement_type,
    quantity, previous_stock, new_stock, sale_id, notes, created_by
  )
  SELECT
    v_sale.company_id, si.product_service_id, 'return',
    si.quantity, ps.current_stock - si.quantity, ps.current_stock,
    p_sale_id, 'Cancelamento: ' || p_reason, auth.uid()
  FROM sale_items si
  JOIN products_services ps ON si.product_service_id = ps.id
  WHERE si.sale_id = p_sale_id AND ps.track_inventory = true;
  
  UPDATE sales
  SET status = 'cancelled', payment_status = 'cancelled',
      cancelled_at = NOW(), cancellation_reason = p_reason
  WHERE id = p_sale_id;
  
  UPDATE payment_installments
  SET status = 'cancelled'
  WHERE sale_id = p_sale_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: convert_budget_to_sale
CREATE OR REPLACE FUNCTION convert_budget_to_sale(
  p_budget_id UUID,
  p_payment_method VARCHAR DEFAULT 'cash',
  p_installments INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
  v_budget RECORD;
  v_sale_id UUID;
  v_installment_amount DECIMAL(15, 2);
BEGIN
  SELECT * INTO v_budget
  FROM budgets
  WHERE id = p_budget_id AND status = 'approved' AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado ou não aprovado';
  END IF;
  
  INSERT INTO sales (
    company_id, customer_id, budget_id, sale_number,
    customer_name, customer_document, subtotal,
    discount_amount, discount_percentage, total_amount,
    payment_method, payment_status, status, created_by
  ) VALUES (
    v_budget.company_id, v_budget.customer_id, p_budget_id,
    generate_sale_number(v_budget.company_id),
    v_budget.customer_name, v_budget.customer_document,
    v_budget.subtotal, v_budget.discount_amount, v_budget.discount_percentage,
    v_budget.total_amount, p_payment_method,
    CASE WHEN p_installments > 1 THEN 'partial' ELSE 'pending' END,
    'completed', auth.uid()
  )
  RETURNING id INTO v_sale_id;
  
  INSERT INTO sale_items (
    sale_id, product_service_id, item_type, sku, name, description,
    quantity, unit_price, discount_percentage, tax_percentage,
    total_amount, cost_price, sort_order
  )
  SELECT
    v_sale_id, bi.product_service_id, bi.item_type, bi.sku,
    bi.name, bi.description, bi.quantity, bi.unit_price,
    bi.discount_percentage, bi.tax_percentage, bi.total_amount,
    ps.cost_price, bi.sort_order
  FROM budget_items bi
  LEFT JOIN products_services ps ON bi.product_service_id = ps.id
  WHERE bi.budget_id = p_budget_id;
  
  IF p_installments > 1 THEN
    v_installment_amount := v_budget.total_amount / p_installments;
    
    FOR i IN 1..p_installments LOOP
      INSERT INTO payment_installments (
        sale_id, installment_number, amount, due_date, payment_method
      ) VALUES (
        v_sale_id, i, v_installment_amount,
        CURRENT_DATE + ((i - 1) * INTERVAL '30 days'), p_payment_method
      );
    END LOOP;
  END IF;
  
  UPDATE budgets
  SET status = 'converted', converted_at = NOW()
  WHERE id = p_budget_id;
  
  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: update_customer_last_contact
CREATE OR REPLACE FUNCTION update_customer_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET last_contact_date = CURRENT_DATE
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_last_contact
  AFTER INSERT ON customer_interactions
  FOR EACH ROW EXECUTE FUNCTION update_customer_last_contact();

-- Função: track_budget_status_changes
CREATE OR REPLACE FUNCTION track_budget_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) OR 
     (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage) OR
     (OLD.win_probability IS DISTINCT FROM NEW.win_probability) THEN
    
    INSERT INTO budget_status_history (
      budget_id, old_status, new_status, old_stage, new_stage,
      old_probability, new_probability, changed_by
    ) VALUES (
      NEW.id, OLD.status, NEW.status, OLD.pipeline_stage, NEW.pipeline_stage,
      OLD.win_probability, NEW.win_probability, auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_budget_status_changes
  AFTER UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION track_budget_status_changes();

-- Função: update_budget_followup_count
CREATE OR REPLACE FUNCTION update_budget_followup_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interaction_type IN ('quote_followup', 'call', 'email', 'meeting') THEN
    UPDATE budgets
    SET followup_count = followup_count + 1, last_followup_at = NOW()
    WHERE id = NEW.budget_id AND NEW.budget_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_budget_followup_count
  AFTER INSERT ON customer_interactions
  FOR EACH ROW EXECUTE FUNCTION update_budget_followup_count();

-- ================================================================
-- VIEWS
-- ================================================================

-- View: vw_low_stock_products
CREATE OR REPLACE VIEW vw_low_stock_products AS
SELECT
  ps.id, ps.company_id, ps.sku, ps.name,
  ps.current_stock, ps.min_stock, ps.stock_unit,
  ps.sale_price, pc.name AS category_name, pc.color AS category_color
FROM products_services ps
LEFT JOIN product_categories pc ON ps.category_id = pc.id
WHERE ps.item_type = 'product'
  AND ps.track_inventory = true
  AND ps.current_stock <= ps.min_stock
  AND ps.is_active = true
  AND ps.deleted_at IS NULL;

-- View: vw_budgets_complete
CREATE OR REPLACE VIEW vw_budgets_complete AS
SELECT
  b.*, c.name AS customer_full_name, c.email AS customer_current_email,
  COUNT(bi.id) AS items_count,
  CASE WHEN b.status = 'sent' AND b.expiry_date < CURRENT_DATE 
       THEN true ELSE false END AS is_expired
FROM budgets b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN budget_items bi ON b.id = bi.budget_id
WHERE b.deleted_at IS NULL
GROUP BY b.id, c.name, c.email;

-- View: vw_sales_complete
CREATE OR REPLACE VIEW vw_sales_complete AS
SELECT
  s.*, c.name AS customer_full_name, c.email AS customer_email,
  c.mobile AS customer_mobile, COUNT(DISTINCT si.id) AS items_count,
  SUM(si.quantity) AS total_items_quantity,
  SUM(si.total_amount - (COALESCE(si.cost_price, 0) * si.quantity)) AS total_profit
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE s.deleted_at IS NULL
GROUP BY s.id, c.name, c.email, c.mobile;

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tabelas com company_id direto
DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'product_categories', 'products_services', 'inventory_movements',
    'customers', 'customer_interactions', 'budgets',
    'followup_tasks', 'sales'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    -- DROP existing policies first
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %s of their companies" ON %s', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert %s to their companies" ON %s', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update %s of their companies" ON %s', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete %s of their companies" ON %s', table_name, table_name);
    
    -- CREATE new policies
    EXECUTE format('
      CREATE POLICY "Users can view %s of their companies"
        ON %s FOR SELECT
        USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
    ', table_name, table_name);

    EXECUTE format('
      CREATE POLICY "Users can insert %s to their companies"
        ON %s FOR INSERT
        WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
    ', table_name, table_name);

    EXECUTE format('
      CREATE POLICY "Users can update %s of their companies"
        ON %s FOR UPDATE
        USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
    ', table_name, table_name);

    EXECUTE format('
      CREATE POLICY "Users can delete %s of their companies"
        ON %s FOR DELETE
        USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
    ', table_name, table_name);
  END LOOP;
END $$;

-- Políticas RLS para budget_items (acessa via budgets)
DROP POLICY IF EXISTS "Users can view budget_items of their companies" ON budget_items;
CREATE POLICY "Users can view budget_items of their companies"
  ON budget_items FOR SELECT
  USING (budget_id IN (
    SELECT id FROM budgets WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert budget_items to their companies" ON budget_items;
CREATE POLICY "Users can insert budget_items to their companies"
  ON budget_items FOR INSERT
  WITH CHECK (budget_id IN (
    SELECT id FROM budgets WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update budget_items of their companies" ON budget_items;
CREATE POLICY "Users can update budget_items of their companies"
  ON budget_items FOR UPDATE
  USING (budget_id IN (
    SELECT id FROM budgets WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete budget_items of their companies" ON budget_items;
CREATE POLICY "Users can delete budget_items of their companies"
  ON budget_items FOR DELETE
  USING (budget_id IN (
    SELECT id FROM budgets WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

-- Políticas RLS para budget_status_history (acessa via budgets)
DROP POLICY IF EXISTS "Users can view budget_status_history of their companies" ON budget_status_history;
CREATE POLICY "Users can view budget_status_history of their companies"
  ON budget_status_history FOR SELECT
  USING (budget_id IN (
    SELECT id FROM budgets WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert budget_status_history to their companies" ON budget_status_history;
CREATE POLICY "Users can insert budget_status_history to their companies"
  ON budget_status_history FOR INSERT
  WITH CHECK (budget_id IN (
    SELECT id FROM budgets WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update budget_status_history of their companies" ON budget_status_history;
CREATE POLICY "Users can update budget_status_history of their companies"
  ON budget_status_history FOR UPDATE
  USING (budget_id IN (
    SELECT id FROM budgets WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete budget_status_history of their companies" ON budget_status_history;
CREATE POLICY "Users can delete budget_status_history of their companies"
  ON budget_status_history FOR DELETE
  USING (budget_id IN (
    SELECT id FROM budgets WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

-- Políticas RLS para sale_items (acessa via sales)
DROP POLICY IF EXISTS "Users can view sale_items of their companies" ON sale_items;
CREATE POLICY "Users can view sale_items of their companies"
  ON sale_items FOR SELECT
  USING (sale_id IN (
    SELECT id FROM sales WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert sale_items to their companies" ON sale_items;
CREATE POLICY "Users can insert sale_items to their companies"
  ON sale_items FOR INSERT
  WITH CHECK (sale_id IN (
    SELECT id FROM sales WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update sale_items of their companies" ON sale_items;
CREATE POLICY "Users can update sale_items of their companies"
  ON sale_items FOR UPDATE
  USING (sale_id IN (
    SELECT id FROM sales WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete sale_items of their companies" ON sale_items;
CREATE POLICY "Users can delete sale_items of their companies"
  ON sale_items FOR DELETE
  USING (sale_id IN (
    SELECT id FROM sales WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

-- Políticas RLS para payment_installments (acessa via sales)
DROP POLICY IF EXISTS "Users can view payment_installments of their companies" ON payment_installments;
CREATE POLICY "Users can view payment_installments of their companies"
  ON payment_installments FOR SELECT
  USING (sale_id IN (
    SELECT id FROM sales WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can insert payment_installments to their companies" ON payment_installments;
CREATE POLICY "Users can insert payment_installments to their companies"
  ON payment_installments FOR INSERT
  WITH CHECK (sale_id IN (
    SELECT id FROM sales WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update payment_installments of their companies" ON payment_installments;
CREATE POLICY "Users can update payment_installments of their companies"
  ON payment_installments FOR UPDATE
  USING (sale_id IN (
    SELECT id FROM sales WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can delete payment_installments of their companies" ON payment_installments;
CREATE POLICY "Users can delete payment_installments of their companies"
  ON payment_installments FOR DELETE
  USING (sale_id IN (
    SELECT id FROM sales WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  ));

COMMIT;
