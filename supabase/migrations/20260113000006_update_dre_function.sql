-- Atualizar função DRE para usar payment_date
CREATE OR REPLACE FUNCTION get_dre_data(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_income_by_category JSON;
  v_expense_by_category JSON;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
BEGIN
  -- Calcular receitas por categoria (usar payment_date)
  SELECT json_agg(
    json_build_object(
      'category', COALESCE(c.name, 'Outros'),
      'amount', total
    ) ORDER BY total DESC
  )
  INTO v_income_by_category
  FROM (
    SELECT 
      t.category_id,
      SUM(t.amount) as total
    FROM transactions t
    WHERE t.company_id = p_company_id
      AND t.type = 'income'
      AND t.status = 'paid'
      AND COALESCE(t.payment_date, t.date)::DATE >= p_start_date
      AND COALESCE(t.payment_date, t.date)::DATE <= p_end_date
    GROUP BY t.category_id
  ) sub
  LEFT JOIN categories c ON sub.category_id = c.id;

  -- Calcular despesas por categoria (usar payment_date)
  SELECT json_agg(
    json_build_object(
      'category', COALESCE(c.name, 'Outros'),
      'amount', total
    ) ORDER BY total DESC
  )
  INTO v_expense_by_category
  FROM (
    SELECT 
      t.category_id,
      SUM(t.amount) as total
    FROM transactions t
    WHERE t.company_id = p_company_id
      AND t.type = 'expense'
      AND t.status = 'paid'
      AND COALESCE(t.payment_date, t.date)::DATE >= p_start_date
      AND COALESCE(t.payment_date, t.date)::DATE <= p_end_date
    GROUP BY t.category_id
  ) sub
  LEFT JOIN categories c ON sub.category_id = c.id;

  -- Calcular total de receitas
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_income
  FROM transactions
  WHERE company_id = p_company_id
    AND type = 'income'
    AND status = 'paid'
    AND COALESCE(payment_date, date)::DATE >= p_start_date
    AND COALESCE(payment_date, date)::DATE <= p_end_date;

  -- Calcular total de despesas
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_expense
  FROM transactions
  WHERE company_id = p_company_id
    AND type = 'expense'
    AND status = 'paid'
    AND COALESCE(payment_date, date)::DATE >= p_start_date
    AND COALESCE(payment_date, date)::DATE <= p_end_date;

  -- Montar resultado
  v_result := json_build_object(
    'income_by_category', COALESCE(v_income_by_category, '[]'::json),
    'expense_by_category', COALESCE(v_expense_by_category, '[]'::json),
    'total_income', v_total_income,
    'total_expense', v_total_expense,
    'result', v_total_income - v_total_expense
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_dre_data IS 'Calculates DRE (Income Statement) using payment_date for accurate period reporting. Credit card expenses appear when invoice is paid.';
