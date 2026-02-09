# Feature: PDV (Ponto de Venda)

## Visão Geral

Sistema completo de Ponto de Venda (PDV) com suporte a vendas à vista e parceladas, múltiplos métodos de pagamento, controle automático de estoque e conversão de orçamentos em vendas.

## Tabelas

### 1. `sales`

Registro de todas as vendas realizadas.

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL, -- Venda originada de orçamento
  
  -- Identificação
  sale_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Dados do cliente (opcional, desnormalizado)
  customer_name VARCHAR(255),
  customer_document VARCHAR(18),
  
  -- Valores
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  
  -- Pagamento
  payment_method VARCHAR(50), -- cash, credit_card, debit_card, pix, bank_transfer, etc.
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'paid', 'partial', 'cancelled', 'refunded')
  ),
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  change_amount DECIMAL(15, 2) DEFAULT 0, -- Troco (quando pago em dinheiro)
  
  -- Status da venda
  status VARCHAR(20) DEFAULT 'completed' CHECK (
    status IN ('draft', 'completed', 'cancelled', 'refunded')
  ),
  
  -- Datas
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  -- Observações
  notes TEXT,
  cancellation_reason TEXT,
  
  -- Fiscal (opcional)
  nfce_number VARCHAR(50), -- Número da NFC-e
  nfce_key VARCHAR(44), -- Chave de acesso da NFC-e
  nfce_status VARCHAR(20), -- pending, authorized, cancelled, denied
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  -- Auditoria
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

COMMENT ON TABLE sales IS 'Registro de vendas realizadas no PDV';
COMMENT ON COLUMN sales.payment_method IS 'Métodos: cash, credit_card, debit_card, pix, bank_transfer, check, other';
COMMENT ON COLUMN sales.change_amount IS 'Troco quando pagamento em dinheiro é maior que o total';
```

### 2. `sale_items`

Itens de cada venda.

```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
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
  
  -- Custo (para cálculo de margem e lucro)
  cost_price DECIMAL(15, 2),
  
  -- Ordem de exibição
  sort_order INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_service_id ON sale_items(product_service_id);

COMMENT ON TABLE sale_items IS 'Itens de cada venda';
COMMENT ON COLUMN sale_items.cost_price IS 'Preço de custo no momento da venda (para cálculo de margem)';
```

### 3. `payment_installments`

Parcelas para vendas parceladas.

```sql
CREATE TABLE payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  
  -- Identificação
  installment_number INTEGER NOT NULL,
  
  -- Valores
  amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  
  -- Datas
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'overdue', 'cancelled')
  ),
  
  -- Método de pagamento da parcela
  payment_method VARCHAR(50),
  
  -- Observações
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sale_id, installment_number)
);

CREATE INDEX idx_payment_installments_sale_id ON payment_installments(sale_id);
CREATE INDEX idx_payment_installments_due_date ON payment_installments(due_date);
CREATE INDEX idx_payment_installments_status ON payment_installments(status);

COMMENT ON TABLE payment_installments IS 'Parcelas de vendas parceladas';
```

## Triggers e Funções

### Atualização automática de `updated_at`

```sql
CREATE TRIGGER update_sales_updated_at 
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_items_updated_at 
  BEFORE UPDATE ON sale_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_installments_updated_at 
  BEFORE UPDATE ON payment_installments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Função para gerar número de venda

```sql
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

COMMENT ON FUNCTION generate_sale_number IS 'Gera número sequencial de venda no formato VND-YYYYMMDD-NNNN';

-- Exemplo: VND-20260207-0001, VND-20260207-0002, etc.
```

### Trigger para atualizar estoque automaticamente

```sql
CREATE OR REPLACE FUNCTION update_inventory_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_product RECORD;
  v_sale_company_id UUID;
BEGIN
  -- Buscar company_id da venda
  SELECT company_id INTO v_sale_company_id
  FROM sales
  WHERE id = NEW.sale_id;
  
  -- Buscar informações do produto
  SELECT * INTO v_product
  FROM products_services
  WHERE id = NEW.product_service_id;
  
  -- Verificar se é produto e se controla estoque
  IF v_product.item_type = 'product' AND v_product.track_inventory THEN
    -- Verificar se há estoque suficiente
    IF v_product.current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para o produto %. Disponível: %, Solicitado: %',
        v_product.name, v_product.current_stock, NEW.quantity;
    END IF;
    
    -- Atualizar estoque
    UPDATE products_services
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_service_id;
    
    -- Registrar movimentação
    INSERT INTO inventory_movements (
      company_id,
      product_service_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      sale_id,
      notes,
      created_by
    ) VALUES (
      v_sale_company_id,
      NEW.product_service_id,
      'sale',
      -NEW.quantity,
      v_product.current_stock,
      v_product.current_stock - NEW.quantity,
      NEW.sale_id,
      'Venda automática - ' || (SELECT sale_number FROM sales WHERE id = NEW.sale_id),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_on_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_sale();

COMMENT ON FUNCTION update_inventory_on_sale IS 'Atualiza estoque automaticamente quando um item é adicionado à venda';
```

### Trigger para calcular totais da venda

```sql
CREATE OR REPLACE FUNCTION calculate_sale_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_discount DECIMAL(15, 2);
  v_sale_discount_pct DECIMAL(5, 2);
BEGIN
  -- Buscar desconto da venda
  SELECT discount_amount, discount_percentage 
  INTO v_sale_discount, v_sale_discount_pct
  FROM sales
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  -- Calcular subtotal e aplicar desconto
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

COMMENT ON FUNCTION calculate_sale_totals IS 'Recalcula automaticamente os totais da venda quando itens são alterados';
```

### Função para cancelar venda

```sql
CREATE OR REPLACE FUNCTION cancel_sale(
  p_sale_id UUID,
  p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
  v_sale RECORD;
BEGIN
  -- Buscar venda
  SELECT * INTO v_sale
  FROM sales
  WHERE id = p_sale_id
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;
  
  IF v_sale.status = 'cancelled' THEN
    RAISE EXCEPTION 'Venda já está cancelada';
  END IF;
  
  -- Reverter estoque de todos os itens
  UPDATE products_services ps
  SET current_stock = current_stock + si.quantity
  FROM sale_items si
  WHERE si.sale_id = p_sale_id
    AND si.product_service_id = ps.id
    AND ps.track_inventory = true;
  
  -- Registrar movimentações de reversão
  INSERT INTO inventory_movements (
    company_id,
    product_service_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    sale_id,
    notes,
    created_by
  )
  SELECT
    v_sale.company_id,
    si.product_service_id,
    'return',
    si.quantity,
    ps.current_stock - si.quantity,
    ps.current_stock,
    p_sale_id,
    'Cancelamento de venda: ' || p_reason,
    auth.uid()
  FROM sale_items si
  JOIN products_services ps ON si.product_service_id = ps.id
  WHERE si.sale_id = p_sale_id
    AND ps.track_inventory = true;
  
  -- Marcar venda como cancelada
  UPDATE sales
  SET
    status = 'cancelled',
    payment_status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_reason
  WHERE id = p_sale_id;
  
  -- Cancelar parcelas pendentes
  UPDATE payment_installments
  SET status = 'cancelled'
  WHERE sale_id = p_sale_id
    AND status = 'pending';
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancel_sale IS 'Cancela uma venda, reverte o estoque e cancela parcelas pendentes';
```

### Função para converter orçamento em venda

```sql
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
  -- Buscar orçamento
  SELECT * INTO v_budget
  FROM budgets
  WHERE id = p_budget_id
    AND status = 'approved'
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado ou não está aprovado';
  END IF;
  
  -- Criar venda
  INSERT INTO sales (
    company_id,
    customer_id,
    budget_id,
    sale_number,
    customer_name,
    customer_document,
    subtotal,
    discount_amount,
    discount_percentage,
    total_amount,
    payment_method,
    payment_status,
    status,
    sale_date,
    created_by
  ) VALUES (
    v_budget.company_id,
    v_budget.customer_id,
    p_budget_id,
    generate_sale_number(v_budget.company_id),
    v_budget.customer_name,
    v_budget.customer_document,
    v_budget.subtotal,
    v_budget.discount_amount,
    v_budget.discount_percentage,
    v_budget.total_amount,
    p_payment_method,
    CASE WHEN p_installments > 1 THEN 'partial' ELSE 'pending' END,
    'completed',
    NOW(),
    auth.uid()
  )
  RETURNING id INTO v_sale_id;
  
  -- Copiar itens do orçamento para a venda
  INSERT INTO sale_items (
    sale_id,
    product_service_id,
    item_type,
    sku,
    name,
    description,
    quantity,
    unit_price,
    discount_percentage,
    tax_percentage,
    total_amount,
    cost_price,
    sort_order
  )
  SELECT
    v_sale_id,
    bi.product_service_id,
    bi.item_type,
    bi.sku,
    bi.name,
    bi.description,
    bi.quantity,
    bi.unit_price,
    bi.discount_percentage,
    bi.tax_percentage,
    bi.total_amount,
    ps.cost_price,
    bi.sort_order
  FROM budget_items bi
  LEFT JOIN products_services ps ON bi.product_service_id = ps.id
  WHERE bi.budget_id = p_budget_id;
  
  -- Criar parcelas se necessário
  IF p_installments > 1 THEN
    v_installment_amount := v_budget.total_amount / p_installments;
    
    FOR i IN 1..p_installments LOOP
      INSERT INTO payment_installments (
        sale_id,
        installment_number,
        amount,
        due_date,
        payment_method
      ) VALUES (
        v_sale_id,
        i,
        v_installment_amount,
        CURRENT_DATE + ((i - 1) * INTERVAL '30 days'),
        p_payment_method
      );
    END LOOP;
  END IF;
  
  -- Marcar orçamento como convertido
  UPDATE budgets
  SET
    status = 'converted',
    converted_at = NOW()
  WHERE id = p_budget_id;
  
  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION convert_budget_to_sale IS 'Converte um orçamento aprovado em venda, com opção de parcelamento';
```

## Views Úteis

### Vendas com informações completas

```sql
CREATE OR REPLACE VIEW vw_sales_complete AS
SELECT
  s.id,
  s.company_id,
  s.customer_id,
  s.budget_id,
  s.sale_number,
  s.customer_name,
  s.customer_document,
  s.subtotal,
  s.discount_amount,
  s.discount_percentage,
  s.total_amount,
  s.payment_method,
  s.payment_status,
  s.paid_amount,
  s.status,
  s.sale_date,
  s.notes,
  s.nfce_number,
  s.nfce_status,
  s.created_at,
  c.name AS customer_full_name,
  c.email AS customer_email,
  c.mobile AS customer_mobile,
  COUNT(DISTINCT si.id) AS items_count,
  SUM(si.quantity) AS total_items_quantity,
  SUM(si.total_amount - (si.cost_price * si.quantity)) AS total_profit,
  u.email AS seller_email
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN sale_items si ON s.id = si.sale_id
LEFT JOIN auth.users u ON s.created_by = u.id
WHERE s.deleted_at IS NULL
GROUP BY s.id, c.name, c.email, c.mobile, u.email;

COMMENT ON VIEW vw_sales_complete IS 'View completa de vendas com informações de cliente e totais calculados';
```

### Vendas do dia

```sql
CREATE OR REPLACE VIEW vw_today_sales AS
SELECT
  s.*,
  COUNT(DISTINCT si.id) AS items_count
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE DATE(s.sale_date) = CURRENT_DATE
  AND s.status = 'completed'
  AND s.deleted_at IS NULL
GROUP BY s.id
ORDER BY s.sale_date DESC;

COMMENT ON VIEW vw_today_sales IS 'Vendas realizadas hoje';
```

## Row Level Security (RLS)

```sql
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

-- Políticas para sales
CREATE POLICY "Users can view sales of their companies"
  ON sales FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sales to their companies"
  ON sales FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sales of their companies"
  ON sales FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Políticas para sale_items
CREATE POLICY "Users can view sale items of their companies"
  ON sale_items FOR SELECT
  USING (
    sale_id IN (
      SELECT id FROM sales WHERE company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert sale items to their sales"
  ON sale_items FOR INSERT
  WITH CHECK (
    sale_id IN (
      SELECT id FROM sales WHERE company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

-- Políticas para payment_installments
CREATE POLICY "Users can view installments of their companies"
  ON payment_installments FOR SELECT
  USING (
    sale_id IN (
      SELECT id FROM sales WHERE company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert installments to their sales"
  ON payment_installments FOR INSERT
  WITH CHECK (
    sale_id IN (
      SELECT id FROM sales WHERE company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update installments of their sales"
  ON payment_installments FOR UPDATE
  USING (
    sale_id IN (
      SELECT id FROM sales WHERE company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
      )
    )
  );
```

## Exemplos de Uso

### Criar uma Venda Simples (À Vista)

```sql
-- Passo 1: Criar venda
INSERT INTO sales (
  company_id,
  customer_id,
  sale_number,
  customer_name,
  payment_method,
  payment_status,
  status,
  created_by
) VALUES (
  'company-uuid',
  'customer-uuid',
  generate_sale_number('company-uuid'),
  'João Silva',
  'cash',
  'paid',
  'completed',
  auth.uid()
)
RETURNING id;

-- Passo 2: Adicionar itens
INSERT INTO sale_items (
  sale_id,
  product_service_id,
  item_type,
  sku,
  name,
  quantity,
  unit_price,
  total_amount,
  cost_price
)
SELECT
  'sale-uuid',
  id,
  item_type,
  sku,
  name,
  2, -- quantidade
  sale_price,
  2 * sale_price,
  cost_price
FROM products_services
WHERE id = 'product-uuid';

-- O trigger atualizará o estoque e os totais automaticamente
```

### Venda Parcelada

```sql
-- Criar venda
INSERT INTO sales (
  company_id,
  sale_number,
  payment_method,
  payment_status,
  status,
  created_by
) VALUES (
  'company-uuid',
  generate_sale_number('company-uuid'),
  'credit_card',
  'partial',
  'completed',
  auth.uid()
)
RETURNING id;

-- Adicionar itens...
-- (mesmo processo da venda simples)

-- Criar 3 parcelas
INSERT INTO payment_installments (
  sale_id,
  installment_number,
  amount,
  due_date,
  payment_method
)
SELECT
  'sale-uuid',
  n,
  1500.00 / 3, -- total dividido por 3
  CURRENT_DATE + ((n - 1) * INTERVAL '30 days'),
  'credit_card'
FROM generate_series(1, 3) AS n;
```

### Converter Orçamento em Venda

```sql
-- Conversão à vista
SELECT convert_budget_to_sale(
  'budget-uuid',
  'pix',
  1 -- à vista
);

-- Conversão parcelada
SELECT convert_budget_to_sale(
  'budget-uuid',
  'credit_card',
  3 -- 3 parcelas
);
```

### Registrar Pagamento de Parcela

```sql
UPDATE payment_installments
SET
  status = 'paid',
  paid_amount = amount,
  paid_at = NOW()
WHERE id = 'installment-uuid';

-- Atualizar status da venda se todas parcelas foram pagas
UPDATE sales s
SET payment_status = 'paid'
WHERE id = (
  SELECT sale_id FROM payment_installments WHERE id = 'installment-uuid'
)
AND NOT EXISTS (
  SELECT 1 FROM payment_installments
  WHERE sale_id = s.id
    AND status != 'paid'
);
```

### Cancelar uma Venda

```sql
SELECT cancel_sale(
  'sale-uuid',
  'Cliente solicitou cancelamento'
);
```

### Relatório de Vendas do Dia

```sql
SELECT
  s.sale_number,
  s.sale_date,
  s.customer_name,
  s.payment_method,
  s.total_amount,
  COUNT(si.id) AS items_count
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE s.company_id = 'company-uuid'
  AND DATE(s.sale_date) = CURRENT_DATE
  AND s.status = 'completed'
  AND s.deleted_at IS NULL
GROUP BY s.id
ORDER BY s.sale_date DESC;
```

### Top 10 Produtos Mais Vendidos (Últimos 30 dias)

```sql
SELECT
  ps.name,
  ps.sku,
  SUM(si.quantity) AS total_quantity,
  COUNT(DISTINCT si.sale_id) AS total_sales,
  SUM(si.total_amount) AS total_revenue,
  SUM(si.total_amount - (si.cost_price * si.quantity)) AS total_profit,
  CASE 
    WHEN SUM(si.total_amount) > 0 THEN
      ROUND((SUM(si.total_amount - (si.cost_price * si.quantity)) / SUM(si.total_amount) * 100)::NUMERIC, 2)
    ELSE 0
  END AS margin_percentage
FROM sale_items si
JOIN products_services ps ON si.product_service_id = ps.id
JOIN sales s ON si.sale_id = s.id
WHERE s.company_id = 'company-uuid'
  AND s.status = 'completed'
  AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'
  AND s.deleted_at IS NULL
GROUP BY ps.id, ps.name, ps.sku
ORDER BY total_revenue DESC
LIMIT 10;
```

### Faturamento por Método de Pagamento

```sql
SELECT
  s.payment_method,
  COUNT(*) AS total_sales,
  SUM(s.total_amount) AS total_revenue,
  AVG(s.total_amount) AS avg_ticket
FROM sales s
WHERE s.company_id = 'company-uuid'
  AND s.status = 'completed'
  AND s.payment_status IN ('paid', 'partial')
  AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'
  AND s.deleted_at IS NULL
GROUP BY s.payment_method
ORDER BY total_revenue DESC;
```

### Parcelas Vencidas

```sql
SELECT
  pi.id,
  s.sale_number,
  s.customer_name,
  pi.installment_number,
  pi.amount,
  pi.due_date,
  CURRENT_DATE - pi.due_date AS days_overdue
FROM payment_installments pi
JOIN sales s ON pi.sale_id = s.id
WHERE s.company_id = 'company-uuid'
  AND pi.status = 'pending'
  AND pi.due_date < CURRENT_DATE
ORDER BY pi.due_date;
```

## Considerações de Implementação

### 1. Métodos de Pagamento Suportados

Configure os métodos de pagamento mais comuns:
- `cash` - Dinheiro
- `credit_card` - Cartão de Crédito
- `debit_card` - Cartão de Débito
- `pix` - PIX
- `bank_transfer` - Transferência Bancária
- `check` - Cheque
- `other` - Outros

### 2. Controle de Caixa

Para implementar controle de caixa, considere adicionar:

```sql
CREATE TABLE cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  opened_by UUID REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  opening_amount DECIMAL(15, 2) DEFAULT 0,
  closing_amount DECIMAL(15, 2),
  expected_amount DECIMAL(15, 2),
  difference DECIMAL(15, 2),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'open',
  notes TEXT
);
```

### 3. Integração Fiscal (NFC-e)

Para emissão de notas fiscais:
- Integrar com um provedor de emissão (ex: Focus NFe, TecnoSpeed)
- Armazenar número e chave da nota nos campos `nfce_number` e `nfce_key`
- Acompanhar status da nota em `nfce_status`
- Armazenar XML/PDF da nota no Supabase Storage

### 4. Impressão de Cupom

Considere criar um template de cupom fiscal/não fiscal:
- Dados da empresa
- Dados do cliente (se informado)
- Lista de itens
- Subtotal, descontos, total
- Método de pagamento
- Informações de parcelas (se houver)

### 5. Performance

Para grandes volumes de vendas:
- Criar índices compostos em colunas frequentemente filtradas juntas
- Usar views materializadas para relatórios pesados
- Particionar tabela `sales` por data se necessário
- Arquivar vendas antigas periodicamente

Exemplo de índice composto:
```sql
CREATE INDEX idx_sales_company_date_status 
  ON sales(company_id, sale_date DESC, status)
  WHERE deleted_at IS NULL;
```

### 6. Auditoria Avançada

Para rastreamento completo, considere criar uma tabela de auditoria:

```sql
CREATE TABLE sale_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- created, updated, cancelled, refunded
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  notes TEXT
);
```

---

**Features Relacionadas:**
- [01 - Produtos e Serviços](./01_produtos_servicos.md)
- [02 - Orçamentos](./02_orcamentos.md)
