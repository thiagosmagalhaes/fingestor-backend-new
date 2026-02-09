-- ================================================================
-- ADICIONAR CATEGORIA "Vendas PDV" ÀS TRANSAÇÕES DE VENDAS
-- ================================================================
-- Quando uma transação é criada a partir de uma venda, ela deve
-- ser vinculada à categoria "Vendas PDV" (criada automaticamente)

CREATE OR REPLACE FUNCTION create_transaction_from_sale(
  p_sale_id UUID,
  p_company_id UUID,
  p_amount DECIMAL,
  p_payment_method_id UUID,
  p_sale_date TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_payment_method RECORD;
  v_net_amount DECIMAL;
  v_fee_amount DECIMAL;
  v_receive_date DATE;
  v_transaction_notes TEXT;
  v_sale_date_formatted TEXT;
  v_status transaction_status;
  v_category_id UUID;
BEGIN
  -- Buscar ou criar categoria "Vendas PDV" para a empresa
  SELECT id INTO v_category_id
  FROM categories
  WHERE company_id = p_company_id
    AND name = 'Vendas PDV'
    AND type = 'income';
  
  -- Se não existir, criar a categoria
  IF v_category_id IS NULL THEN
    INSERT INTO categories (
      company_id,
      name,
      type,
      color
    ) VALUES (
      p_company_id,
      'Vendas PDV',
      'income',
      '#10b981' -- Verde
    )
    RETURNING id INTO v_category_id;
  END IF;

  -- Buscar informações do método de pagamento
  SELECT 
    name, 
    fee_percentage, 
    fee_fixed_amount, 
    days_to_receive
  INTO v_payment_method
  FROM payment_methods
  WHERE id = p_payment_method_id;

  -- Se não encontrou o método de pagamento, usar valores padrão
  IF v_payment_method IS NULL THEN
    v_payment_method.name := 'Método não especificado';
    v_payment_method.fee_percentage := 0;
    v_payment_method.fee_fixed_amount := 0;
    v_payment_method.days_to_receive := 0;
  END IF;

  -- Calcular taxa
  v_fee_amount := (p_amount * v_payment_method.fee_percentage / 100) + v_payment_method.fee_fixed_amount;
  
  -- Calcular valor líquido (após taxas)
  v_net_amount := p_amount - v_fee_amount;

  -- Calcular data de recebimento (data da venda + days_to_receive)
  v_receive_date := (p_sale_date::DATE) + (v_payment_method.days_to_receive || ' days')::INTERVAL;

  -- Formatar data da venda para a nota
  v_sale_date_formatted := TO_CHAR(p_sale_date, 'DD/MM/YYYY');

  -- Criar nota formatada
  v_transaction_notes := FORMAT(
    'Venda realizada em %s - Valor bruto: R$ %s - Taxa aplicada: R$ %s (%s%%) - Método: %s',
    v_sale_date_formatted,
    TO_CHAR(p_amount, 'FM999G999G999D90'),
    TO_CHAR(v_fee_amount, 'FM999G999G999D90'),
    TO_CHAR(v_payment_method.fee_percentage, 'FM990D00'),
    v_payment_method.name
  );

  -- Determinar status com cast correto
  IF v_receive_date <= CURRENT_DATE THEN
    v_status := 'paid'::transaction_status;
  ELSE
    v_status := 'pending'::transaction_status;
  END IF;

  -- Inserir transação de receita com categoria
  INSERT INTO transactions (
    company_id,
    sale_id,
    category_id,
    type,
    description,
    amount,
    date,
    status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_company_id,
    p_sale_id,
    v_category_id, -- Categoria "Vendas PDV"
    'income',
    'Recebimento de venda - ' || v_payment_method.name,
    v_net_amount, -- Valor líquido após taxas
    v_receive_date,
    v_status,
    v_transaction_notes,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_transaction_from_sale IS 'Cria uma transação financeira a partir de uma venda do PDV na categoria "Vendas PDV", calculando valor líquido após taxas e data de recebimento';
