-- Atualizar view para usar payment_date no filtro de data
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
  -- Usar payment_date se disponível, caso contrário usar date
  -- Isso garante que compras no cartão apareçam no mês que a fatura foi paga
  AND COALESCE(t.payment_date, t.date)::DATE >= DATE_TRUNC('month', CURRENT_DATE)::DATE
  AND COALESCE(t.payment_date, t.date)::DATE <= (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
GROUP BY t.company_id, t.category_id, c.name, c.color
ORDER BY total_amount DESC;

COMMENT ON VIEW category_breakdown_current_month IS 'Shows expenses by category for current month using payment_date for accurate cash flow tracking.';
