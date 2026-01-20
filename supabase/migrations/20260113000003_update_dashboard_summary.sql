-- Atualizar função para calcular o resumo do dashboard
-- Agora exclui transações de cartão pending das "pendentes a pagar"
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_pending_income NUMERIC;
  v_pending_expense NUMERIC;
  v_result JSON;
BEGIN
  -- Calcular receitas pagas (usar payment_date quando disponível)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_income
  FROM transactions
  WHERE company_id = p_company_id
    AND status = 'paid'
    AND type = 'income'
    AND COALESCE(payment_date, date) >= p_start_date
    AND COALESCE(payment_date, date) <= p_end_date;

  -- Calcular despesas pagas (usar payment_date quando disponível)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_expense
  FROM transactions
  WHERE company_id = p_company_id
    AND status = 'paid'
    AND type = 'expense'
    AND COALESCE(payment_date, date) >= p_start_date
    AND COALESCE(payment_date, date) <= p_end_date;

  -- Calcular receitas pendentes (excluir transações de cartão)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_income
  FROM transactions
  WHERE company_id = p_company_id
    AND status IN ('pending', 'scheduled')
    AND type = 'income'
    AND is_credit_card = false
    AND date >= p_start_date
    AND date <= p_end_date;

  -- Calcular despesas pendentes (excluir transações de cartão)
  -- Transações de cartão só contam quando a fatura é paga
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_expense
  FROM transactions
  WHERE company_id = p_company_id
    AND status IN ('pending', 'scheduled')
    AND type = 'expense'
    AND is_credit_card = false
    AND date >= p_start_date
    AND date <= p_end_date;

  -- Montar o resultado JSON
  v_result := json_build_object(
    'total_income', v_total_income,
    'total_expense', v_total_expense,
    'balance', v_total_income - v_total_expense,
    'pending_income', v_pending_income,
    'pending_expense', v_pending_expense
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_summary IS 'Calculates dashboard summary excluding credit card pending transactions. Credit card transactions only count when invoice is paid.';
