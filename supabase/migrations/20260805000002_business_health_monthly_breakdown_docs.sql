-- Documentação apenas — nenhuma mudança de lógica/comportamento nesta migration.
-- Deixa explícito que:
--   1) O filtro `status = 'paid'` + coluna `date` segue a MESMA convenção de
--      get_business_health_data / DRE (ver comentário detalhado em
--      20260805000001_business_health_period_bound_overdue.sql) — não usa
--      payment_date, então diverge de Dashboard Summary/Cash Flow de propósito.
--   2) `despesas`/`saldo` retornados aqui somam type = 'expense' SEM separar
--      nature (COST vs EXPENSE) — hoje o controller do business-health só lê o
--      campo `receitas` de cada mês (para revenue.last12Months e revenue.trend).
--      Não usar `despesas`/`saldo` desta função para compor totais que precisem
--      bater com custos/despesas de get_business_health_data ou da DRE sem
--      revisar essa diferença primeiro.
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

    -- Só transações pagas (status = 'paid'), pela data da transação — mesma
    -- convenção da DRE e de get_business_health_data (ver nota acima).
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

COMMENT ON FUNCTION get_business_health_monthly_breakdown(UUID, DATE, DATE) IS 'Quebra mensal de receitas/despesas (paid, pela data da transação — mesma convenção da DRE) dentro do período exato [p_start_date, p_end_date], usada pelo endpoint /api/business-health para respeitar o filtro de data selecionado. Apenas o campo receitas de cada mês é consumido hoje pelo controller; despesas/saldo não separam nature (COST/EXPENSE).';
