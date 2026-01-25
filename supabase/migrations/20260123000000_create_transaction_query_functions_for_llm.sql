-- Migration: Create transaction query functions for LLM
-- These functions return aggregated data to avoid overwhelming the LLM with too much information

-- Function 1: Get transactions summary by period
-- Returns aggregated data grouped by day, week, or month
CREATE OR REPLACE FUNCTION public.get_transactions_by_period(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_period_type TEXT DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS TABLE(
  period_start DATE,
  period_end DATE,
  total_income DECIMAL(15,2),
  total_expenses DECIMAL(15,2),
  net_amount DECIMAL(15,2),
  income_count INTEGER,
  expense_count INTEGER,
  total_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH period_groups AS (
    SELECT
      t.date,
      t.type,
      t.amount,
      CASE 
        WHEN p_period_type = 'week' THEN 
          DATE_TRUNC('week', t.date)::DATE
        WHEN p_period_type = 'month' THEN 
          DATE_TRUNC('month', t.date)::DATE
        ELSE t.date
      END as period_date
    FROM public.transactions t
    WHERE t.company_id = p_company_id
      AND t.date >= p_start_date
      AND t.date <= p_end_date
      AND t.status = 'paid'
  )
  SELECT
    pg.period_date as period_start,
    CASE 
      WHEN p_period_type = 'week' THEN 
        (pg.period_date + INTERVAL '6 days')::DATE
      WHEN p_period_type = 'month' THEN 
        (DATE_TRUNC('month', pg.period_date) + INTERVAL '1 month - 1 day')::DATE
      ELSE pg.period_date
    END as period_end,
    COALESCE(SUM(CASE WHEN pg.type = 'income' THEN pg.amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN pg.type = 'expense' THEN pg.amount ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN pg.type = 'income' THEN pg.amount ELSE -pg.amount END), 0) as net_amount,
    COUNT(CASE WHEN pg.type = 'income' THEN 1 END)::INTEGER as income_count,
    COUNT(CASE WHEN pg.type = 'expense' THEN 1 END)::INTEGER as expense_count,
    COUNT(*)::INTEGER as total_count
  FROM period_groups pg
  GROUP BY pg.period_date
  ORDER BY pg.period_date;
END;
$$;

-- Function 2: Get transactions grouped by category
-- Returns top categories with aggregated amounts
CREATE OR REPLACE FUNCTION public.get_transactions_by_category(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_type TEXT DEFAULT 'ambos', -- 'income', 'expense' or 'ambos' for both
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  category_id UUID,
  category_name TEXT,
  category_color TEXT,
  transaction_type transaction_type,
  total_amount DECIMAL(15,2),
  transaction_count INTEGER,
  avg_amount DECIMAL(15,2),
  percentage_of_total DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH category_totals AS (
    SELECT
      COALESCE(c.id, '00000000-0000-0000-0000-000000000000'::UUID) as cat_id,
      COALESCE(c.name, 'Sem Categoria') as cat_name,
      COALESCE(c.color, '#808080') as cat_color,
      t.type as trans_type,
      SUM(t.amount) as total_amt,
      COUNT(*)::INTEGER as trans_count,
      AVG(t.amount) as avg_amt
    FROM public.transactions t
    LEFT JOIN public.categories c ON t.category_id = c.id
    WHERE t.company_id = p_company_id
      AND t.date >= p_start_date
      AND t.date <= p_end_date
      AND t.status = 'paid'
      AND (p_type = 'ambos' OR t.type::TEXT = p_type)
    GROUP BY c.id, c.name, c.color, t.type
  ),
  total_sum AS (
    SELECT SUM(total_amt) as grand_total
    FROM category_totals
  )
  SELECT
    ct.cat_id,
    ct.cat_name,
    ct.cat_color,
    ct.trans_type,
    ct.total_amt,
    ct.trans_count,
    ROUND(ct.avg_amt, 2) as avg_amt,
    CASE 
      WHEN ts.grand_total > 0 THEN ROUND((ct.total_amt / ts.grand_total * 100)::NUMERIC, 2)
      ELSE 0
    END as percentage_of_total
  FROM category_totals ct
  CROSS JOIN total_sum ts
  ORDER BY ct.total_amt DESC
  LIMIT p_limit;
END;
$$;

-- Function 3: Get transaction statistics summary
-- Returns key metrics and statistics
CREATE OR REPLACE FUNCTION public.get_transactions_statistics(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  metric_name TEXT,
  metric_value DECIMAL(15,2),
  metric_description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
      AVG(CASE WHEN type = 'income' THEN amount END) as avg_income,
      AVG(CASE WHEN type = 'expense' THEN amount END) as avg_expense,
      MAX(CASE WHEN type = 'income' THEN amount END) as max_income,
      MAX(CASE WHEN type = 'expense' THEN amount END) as max_expense,
      MIN(CASE WHEN type = 'income' THEN amount END) as min_income,
      MIN(CASE WHEN type = 'expense' THEN amount END) as min_expense,
      COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
      COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN is_installment = true THEN 1 END) as installment_count,
      COUNT(CASE WHEN is_credit_card = true THEN 1 END) as credit_card_count
    FROM public.transactions
    WHERE company_id = p_company_id
      AND date >= p_start_date
      AND date <= p_end_date
      AND status = 'paid'
  )
  SELECT * FROM (
    SELECT 'total_income'::TEXT, COALESCE(total_income, 0), 'Total de receitas no período'::TEXT FROM stats
    UNION ALL
    SELECT 'total_expenses'::TEXT, COALESCE(total_expenses, 0), 'Total de despesas no período'::TEXT FROM stats
    UNION ALL
    SELECT 'net_balance'::TEXT, COALESCE(total_income - total_expenses, 0), 'Saldo líquido (receitas - despesas)'::TEXT FROM stats
    UNION ALL
    SELECT 'avg_income'::TEXT, COALESCE(ROUND(avg_income, 2), 0), 'Média de valor por receita'::TEXT FROM stats
    UNION ALL
    SELECT 'avg_expense'::TEXT, COALESCE(ROUND(avg_expense, 2), 0), 'Média de valor por despesa'::TEXT FROM stats
    UNION ALL
    SELECT 'max_income'::TEXT, COALESCE(max_income, 0), 'Maior receita registrada'::TEXT FROM stats
    UNION ALL
    SELECT 'max_expense'::TEXT, COALESCE(max_expense, 0), 'Maior despesa registrada'::TEXT FROM stats
    UNION ALL
    SELECT 'min_income'::TEXT, COALESCE(min_income, 0), 'Menor receita registrada'::TEXT FROM stats
    UNION ALL
    SELECT 'min_expense'::TEXT, COALESCE(min_expense, 0), 'Menor despesa registrada'::TEXT FROM stats
    UNION ALL
    SELECT 'income_count'::TEXT, income_count::DECIMAL, 'Quantidade de receitas'::TEXT FROM stats
    UNION ALL
    SELECT 'expense_count'::TEXT, expense_count::DECIMAL, 'Quantidade de despesas'::TEXT FROM stats
    UNION ALL
    SELECT 'pending_count'::TEXT, pending_count::DECIMAL, 'Quantidade de transações pendentes'::TEXT FROM stats
    UNION ALL
    SELECT 'installment_count'::TEXT, installment_count::DECIMAL, 'Quantidade de transações parceladas'::TEXT FROM stats
    UNION ALL
    SELECT 'credit_card_count'::TEXT, credit_card_count::DECIMAL, 'Quantidade de transações no cartão'::TEXT FROM stats
  ) as metrics;
END;
$$;

-- Function 4: Get top transactions by amount
-- Returns the largest income and expense transactions
CREATE OR REPLACE FUNCTION public.get_top_transactions(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_type transaction_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  date DATE,
  type transaction_type,
  description TEXT,
  amount DECIMAL(15,2),
  category_name TEXT,
  status transaction_status,
  is_installment BOOLEAN,
  is_credit_card BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.date,
    t.type,
    t.description,
    t.amount,
    COALESCE(c.name, 'Sem Categoria') as category_name,
    t.status,
    t.is_installment,
    t.is_credit_card
  FROM public.transactions t
  LEFT JOIN public.categories c ON t.category_id = c.id
  WHERE t.company_id = p_company_id
    AND t.date >= p_start_date
    AND t.date <= p_end_date
    AND (p_type IS NULL OR t.type = p_type)
  ORDER BY t.amount DESC
  LIMIT p_limit;
END;
$$;

-- Function 5: Get transactions comparison between periods
-- Compares two periods to identify trends
CREATE OR REPLACE FUNCTION public.compare_transaction_periods(
  p_company_id UUID,
  p_period1_start DATE,
  p_period1_end DATE,
  p_period2_start DATE,
  p_period2_end DATE
)
RETURNS TABLE(
  metric TEXT,
  period1_value DECIMAL(15,2),
  period2_value DECIMAL(15,2),
  difference DECIMAL(15,2),
  percentage_change DECIMAL(5,2),
  trend TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH period1 AS (
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
      COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
      COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
    FROM public.transactions
    WHERE company_id = p_company_id
      AND date >= p_period1_start
      AND date <= p_period1_end
      AND status = 'paid'
  ),
  period2 AS (
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
      COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
      COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
    FROM public.transactions
    WHERE company_id = p_company_id
      AND date >= p_period2_start
      AND date <= p_period2_end
      AND status = 'paid'
  )
  SELECT * FROM (
    SELECT
      'total_income'::TEXT as metric,
      COALESCE(p1.income, 0) as period1_value,
      COALESCE(p2.income, 0) as period2_value,
      COALESCE(p2.income - p1.income, 0) as difference,
      CASE 
        WHEN p1.income > 0 THEN ROUND(((p2.income - p1.income) / p1.income * 100)::NUMERIC, 2)
        ELSE 0
      END as percentage_change,
      CASE
        WHEN p2.income > p1.income THEN 'up'::TEXT
        WHEN p2.income < p1.income THEN 'down'::TEXT
        ELSE 'stable'::TEXT
      END as trend
    FROM period1 p1, period2 p2
    
    UNION ALL
    
    SELECT
      'total_expenses'::TEXT,
      COALESCE(p1.expense, 0),
      COALESCE(p2.expense, 0),
      COALESCE(p2.expense - p1.expense, 0),
      CASE 
        WHEN p1.expense > 0 THEN ROUND(((p2.expense - p1.expense) / p1.expense * 100)::NUMERIC, 2)
        ELSE 0
      END,
      CASE
        WHEN p2.expense > p1.expense THEN 'up'::TEXT
        WHEN p2.expense < p1.expense THEN 'down'::TEXT
        ELSE 'stable'::TEXT
      END
    FROM period1 p1, period2 p2
    
    UNION ALL
    
    SELECT
      'net_balance'::TEXT,
      COALESCE(p1.income - p1.expense, 0),
      COALESCE(p2.income - p2.expense, 0),
      COALESCE((p2.income - p2.expense) - (p1.income - p1.expense), 0),
      CASE 
        WHEN (p1.income - p1.expense) != 0 THEN 
          ROUND((((p2.income - p2.expense) - (p1.income - p1.expense)) / ABS(p1.income - p1.expense) * 100)::NUMERIC, 2)
        ELSE 0
      END,
      CASE
        WHEN (p2.income - p2.expense) > (p1.income - p1.expense) THEN 'up'::TEXT
        WHEN (p2.income - p2.expense) < (p1.income - p1.expense) THEN 'down'::TEXT
        ELSE 'stable'::TEXT
      END
    FROM period1 p1, period2 p2
    
    UNION ALL
    
    SELECT
      'income_transactions'::TEXT,
      COALESCE(p1.income_count::DECIMAL, 0),
      COALESCE(p2.income_count::DECIMAL, 0),
      COALESCE((p2.income_count - p1.income_count)::DECIMAL, 0),
      CASE 
        WHEN p1.income_count > 0 THEN 
          ROUND(((p2.income_count - p1.income_count)::DECIMAL / p1.income_count * 100)::NUMERIC, 2)
        ELSE 0
      END,
      CASE
        WHEN p2.income_count > p1.income_count THEN 'up'::TEXT
        WHEN p2.income_count < p1.income_count THEN 'down'::TEXT
        ELSE 'stable'::TEXT
      END
    FROM period1 p1, period2 p2
    
    UNION ALL
    
    SELECT
      'expense_transactions'::TEXT,
      COALESCE(p1.expense_count::DECIMAL, 0),
      COALESCE(p2.expense_count::DECIMAL, 0),
      COALESCE((p2.expense_count - p1.expense_count)::DECIMAL, 0),
      CASE 
        WHEN p1.expense_count > 0 THEN 
          ROUND(((p2.expense_count - p1.expense_count)::DECIMAL / p1.expense_count * 100)::NUMERIC, 2)
        ELSE 0
      END,
      CASE
        WHEN p2.expense_count > p1.expense_count THEN 'up'::TEXT
        WHEN p2.expense_count < p1.expense_count THEN 'down'::TEXT
        ELSE 'stable'::TEXT
      END
    FROM period1 p1, period2 p2
  ) as comparison;
END;
$$;

-- Function 6: Get monthly trends
-- Shows evolution of income and expenses over months
CREATE OR REPLACE FUNCTION public.get_monthly_trends(
  p_company_id UUID,
  p_months_back INTEGER DEFAULT 12
)
RETURNS TABLE(
  month_date DATE,
  month_name TEXT,
  total_income DECIMAL(15,2),
  total_expenses DECIMAL(15,2),
  net_balance DECIMAL(15,2),
  income_growth_percent DECIMAL(5,2),
  expense_growth_percent DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT
      DATE_TRUNC('month', t.date)::DATE as month,
      SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense
    FROM public.transactions t
    WHERE t.company_id = p_company_id
      AND t.date >= (CURRENT_DATE - (p_months_back || ' months')::INTERVAL)
      AND t.status = 'paid'
    GROUP BY DATE_TRUNC('month', t.date)
  ),
  with_previous AS (
    SELECT
      md.month,
      md.income,
      md.expense,
      LAG(md.income) OVER (ORDER BY md.month) as prev_income,
      LAG(md.expense) OVER (ORDER BY md.month) as prev_expense
    FROM monthly_data md
  )
  SELECT
    wp.month as month_date,
    TO_CHAR(wp.month, 'Month YYYY') as month_name,
    COALESCE(wp.income, 0) as total_income,
    COALESCE(wp.expense, 0) as total_expenses,
    COALESCE(wp.income - wp.expense, 0) as net_balance,
    CASE 
      WHEN wp.prev_income > 0 THEN 
        ROUND(((wp.income - wp.prev_income) / wp.prev_income * 100)::NUMERIC, 2)
      ELSE 0
    END as income_growth_percent,
    CASE 
      WHEN wp.prev_expense > 0 THEN 
        ROUND(((wp.expense - wp.prev_expense) / wp.prev_expense * 100)::NUMERIC, 2)
      ELSE 0
    END as expense_growth_percent
  FROM with_previous wp
  ORDER BY wp.month;
END;
$$;

-- Function 7: Get transactions by payment method
-- Groups transactions by payment method (cash, credit card, installments)
CREATE OR REPLACE FUNCTION public.get_transactions_by_payment_method(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  payment_method TEXT,
  total_amount DECIMAL(15,2),
  transaction_count INTEGER,
  avg_amount DECIMAL(15,2),
  percentage_of_total DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH payment_data AS (
    SELECT
      CASE
        WHEN t.is_credit_card = true THEN 'Cartão de Crédito'
        WHEN t.is_installment = true THEN 'Parcelado'
        ELSE 'À Vista'
      END as method,
      SUM(t.amount) as total,
      COUNT(*)::INTEGER as count,
      AVG(t.amount) as avg
    FROM public.transactions t
    WHERE t.company_id = p_company_id
      AND t.date >= p_start_date
      AND t.date <= p_end_date
      AND t.status = 'paid'
    GROUP BY 
      CASE
        WHEN t.is_credit_card = true THEN 'Cartão de Crédito'
        WHEN t.is_installment = true THEN 'Parcelado'
        ELSE 'À Vista'
      END
  ),
  total_sum AS (
    SELECT SUM(total) as grand_total
    FROM payment_data
  )
  SELECT
    pd.method as payment_method,
    pd.total as total_amount,
    pd.count as transaction_count,
    ROUND(pd.avg, 2) as avg_amount,
    CASE 
      WHEN ts.grand_total > 0 THEN ROUND((pd.total / ts.grand_total * 100)::NUMERIC, 2)
      ELSE 0
    END as percentage_of_total
  FROM payment_data pd
  CROSS JOIN total_sum ts
  ORDER BY pd.total DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_transactions_by_period TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transactions_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transactions_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION public.compare_transaction_periods TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_trends TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transactions_by_payment_method TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_transactions_by_period IS 'Retorna transações agregadas por período (dia, semana ou mês) - otimizado para LLM';
COMMENT ON FUNCTION public.get_transactions_by_category IS 'Retorna transações agrupadas por categoria com percentuais - otimizado para LLM';
COMMENT ON FUNCTION public.get_transactions_statistics IS 'Retorna estatísticas e métricas chave das transações - otimizado para LLM';
COMMENT ON FUNCTION public.get_top_transactions IS 'Retorna as maiores transações do período - otimizado para LLM';
COMMENT ON FUNCTION public.compare_transaction_periods IS 'Compara dois períodos e mostra tendências - otimizado para LLM';
COMMENT ON FUNCTION public.get_monthly_trends IS 'Retorna tendências mensais de receitas e despesas - otimizado para LLM';
COMMENT ON FUNCTION public.get_transactions_by_payment_method IS 'Retorna transações agrupadas por método de pagamento - otimizado para LLM';
