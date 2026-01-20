-- Função para calcular dados do fluxo de caixa (últimos 6 meses)
CREATE OR REPLACE FUNCTION get_cash_flow_chart_data(
  p_company_id UUID,
  p_months INTEGER DEFAULT 6
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_month_data JSON;
  v_months JSON[] := '{}';
  v_start_date DATE;
  v_end_date DATE;
  v_income NUMERIC;
  v_expense NUMERIC;
  i INTEGER;
BEGIN
  -- Iterar pelos últimos N meses
  FOR i IN REVERSE (p_months - 1)..0 LOOP
    v_start_date := DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE;
    v_end_date := (DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL) + INTERVAL '1 month - 1 day')::DATE;
    
    -- Calcular receitas do mês
    SELECT COALESCE(SUM(amount), 0)
    INTO v_income
    FROM transactions
    WHERE company_id = p_company_id
      AND status = 'paid'
      AND type = 'income'
      AND date >= v_start_date
      AND date <= v_end_date;
    
    -- Calcular despesas do mês
    SELECT COALESCE(SUM(amount), 0)
    INTO v_expense
    FROM transactions
    WHERE company_id = p_company_id
      AND status = 'paid'
      AND type = 'expense'
      AND date >= v_start_date
      AND date <= v_end_date;
    
    -- Montar objeto do mês
    v_month_data := json_build_object(
      'month', TO_CHAR(v_start_date, 'Mon'),
      'month_full', TO_CHAR(v_start_date, 'YYYY-MM-DD'),
      'receitas', v_income,
      'despesas', v_expense,
      'saldo', v_income - v_expense
    );
    
    v_months := array_append(v_months, v_month_data);
  END LOOP;
  
  -- Retornar array de meses como JSON
  v_result := array_to_json(v_months);
  
  RETURN v_result;
END;
$$;
