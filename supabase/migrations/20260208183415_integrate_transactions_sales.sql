-- ================================================================
-- INTEGRAÇÃO: Transactions com Sales
-- ================================================================
-- Adiciona vinculação entre transações e vendas do PDV
-- Quando uma venda é criada, uma transação financeira correspondente
-- é gerada automaticamente, respeitando:
-- - Prazo de recebimento do método de pagamento (days_to_receive)
-- - Taxas aplicadas ao método de pagamento
-- - Vinculação para exclusão em cascata se a venda for cancelada

-- Adicionar campo sale_id na tabela transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_sale_id ON transactions(sale_id);

-- Comentário
COMMENT ON COLUMN transactions.sale_id IS 'Referência à venda do PDV que originou esta transação (opcional). Se a venda for cancelada, a transação é excluída automaticamente.';

-- ================================================================
-- FUNÇÃO: Criar transação a partir de venda
-- ================================================================

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
BEGIN
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

  -- Inserir transação de receita
  INSERT INTO transactions (
    company_id,
    sale_id,
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
    'income',
    'Recebimento de venda - ' || v_payment_method.name,
    v_net_amount, -- Valor líquido após taxas
    v_receive_date,
    CASE 
      WHEN v_receive_date <= CURRENT_DATE THEN 'paid'
      ELSE 'pending'
    END,
    v_transaction_notes,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_transaction_from_sale TO authenticated;

COMMENT ON FUNCTION create_transaction_from_sale IS 'Cria uma transação financeira a partir de uma venda do PDV, calculando valor líquido após taxas e data de recebimento';

-- ================================================================
-- TRIGGER: Criar transação automaticamente ao criar venda
-- ================================================================

CREATE OR REPLACE FUNCTION trigger_create_transaction_from_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas criar transação se payment_method_id estiver presente
  -- e a venda não estiver com status 'draft' ou 'cancelled'
  IF NEW.payment_method_id IS NOT NULL 
     AND NEW.status NOT IN ('draft', 'cancelled') 
     AND NEW.payment_status IN ('paid', 'partial') THEN
    
    PERFORM create_transaction_from_sale(
      NEW.id,
      NEW.company_id,
      NEW.total_amount,
      NEW.payment_method_id,
      NEW.sale_date
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
CREATE TRIGGER trigger_auto_create_transaction_from_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_transaction_from_sale();

COMMENT ON TRIGGER trigger_auto_create_transaction_from_sale ON sales IS 'Cria automaticamente uma transação financeira quando uma venda é registrada';

