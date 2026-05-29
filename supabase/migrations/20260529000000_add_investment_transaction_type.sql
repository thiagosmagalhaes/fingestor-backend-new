-- Add 'investment' value to the transaction_type enum
-- Investment transactions will not appear as income or expense in dashboards, DRE, or cash flow
-- All existing SQL functions (get_dashboard_summary, get_cash_flow_chart_data, get_dre_data, etc.)
-- already filter explicitly on type = 'income' or type = 'expense', so investment is automatically excluded.

ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'investment';

COMMENT ON TYPE public.transaction_type IS 'Transaction type: income (receita), expense (despesa), investment (investimento). Investments are not counted in income/expense dashboards.';