-- View para mostrar despesas por categoria no mês atual
CREATE OR REPLACE VIEW category_breakdown_current_month AS
SELECT 
  t.company_id,
  t.category_id,
  c.name as category_name,
  c.color as category_color,
  SUM(t.amount) as total_amount,
  COUNT(t.id) as transaction_count
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE 
  t.type = 'expense'
  AND t.status = 'paid'
  AND t.date >= DATE_TRUNC('month', CURRENT_DATE)::DATE
  AND t.date <= (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
GROUP BY t.company_id, t.category_id, c.name, c.color
ORDER BY total_amount DESC;

-- Função para buscar breakdown de categorias com limite
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_company_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_total_expenses NUMERIC;
BEGIN
  -- Calcular total de despesas
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_expenses
  FROM category_breakdown_current_month
  WHERE company_id = p_company_id;
  
  -- Buscar top categorias com percentual
  SELECT json_agg(
    json_build_object(
      'name', COALESCE(category_name, 'Outros'),
      'value', total_amount,
      'color', COALESCE(category_color, '#64748b'),
      'percentage', CASE 
        WHEN v_total_expenses > 0 THEN ROUND((total_amount / v_total_expenses * 100)::NUMERIC, 1)
        ELSE 0
      END,
      'transaction_count', transaction_count
    )
  )
  INTO v_result
  FROM (
    SELECT *
    FROM category_breakdown_current_month
    WHERE company_id = p_company_id
    ORDER BY total_amount DESC
    LIMIT p_limit
  ) sub;
  
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
