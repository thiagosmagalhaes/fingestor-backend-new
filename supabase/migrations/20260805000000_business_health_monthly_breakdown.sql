-- Quebra mensal de receitas/despesas dentro do período exato selecionado no
-- endpoint de business health. Substitui o uso de get_cash_flow_chart_data
-- (que sempre traz os últimos N meses a partir de hoje, ignorando o filtro
-- from/to) por uma função que soma exatamente o intervalo pedido, mês a mês,
-- inclusive nos meses parciais nas pontas.
CREATE OR REPLACE FUNCTION get_business_health_monthly_breakdown(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_months JSON[] := '{}';
  v_month_data JSON;
  v_cursor DATE;
  v_month_start DATE;
  v_month_end DATE;
  v_income NUMERIC;
  v_expense NUMERIC;
BEGIN
  v_cursor := DATE_TRUNC('month', p_start_date)::DATE;

  WHILE v_cursor <= p_end_date LOOP
    v_month_start := GREATEST(v_cursor, p_start_date);
    v_month_end := LEAST((v_cursor + INTERVAL '1 month - 1 day')::DATE, p_end_date);

    SELECT
      COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0),
      COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)
    INTO v_income, v_expense
    FROM transactions
    WHERE company_id = p_company_id
      AND status = 'paid'
      AND date >= v_month_start
      AND date <= v_month_end;

    v_month_data := json_build_object(
      'month', TO_CHAR(v_cursor, 'Mon'),
      'month_full', TO_CHAR(v_cursor, 'YYYY-MM-DD'),
      'receitas', v_income,
      'despesas', v_expense,
      'saldo', v_income - v_expense
    );

    v_months := array_append(v_months, v_month_data);
    v_cursor := (v_cursor + INTERVAL '1 month')::DATE;
  END LOOP;

  v_result := array_to_json(v_months);
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_business_health_monthly_breakdown(UUID, DATE, DATE) TO authenticated;

COMMENT ON FUNCTION get_business_health_monthly_breakdown(UUID, DATE, DATE) IS 'Quebra mensal de receitas/despesas (paid) dentro do período exato [p_start_date, p_end_date], usada pelo endpoint /api/business-health para respeitar o filtro de data selecionado (em vez de sempre olhar os últimos 12 meses a partir de hoje).';
