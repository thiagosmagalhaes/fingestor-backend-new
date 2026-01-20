-- Função para calcular o resumo do dashboard
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
  -- Calcular receitas pagas
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_income
  FROM transactions
  WHERE company_id = p_company_id
    AND status = 'paid'
    AND type = 'income'
    AND date >= p_start_date
    AND date <= p_end_date;

  -- Calcular despesas pagas
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_expense
  FROM transactions
  WHERE company_id = p_company_id
    AND status = 'paid'
    AND type = 'expense'
    AND date >= p_start_date
    AND date <= p_end_date;

  -- Calcular receitas pendentes
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_income
  FROM transactions
  WHERE company_id = p_company_id
    AND status IN ('pending', 'scheduled')
    AND type = 'income'
    AND date >= p_start_date
    AND date <= p_end_date;

  -- Calcular despesas pendentes
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_expense
  FROM transactions
  WHERE company_id = p_company_id
    AND status IN ('pending', 'scheduled')
    AND type = 'expense'
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
