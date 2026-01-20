-- Atualizar função get_dashboard_summary para incluir transações de cartão que vencem no mês
-- Respeita a regra de fechamento da fatura do cartão

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
  v_pending_credit_card_expense NUMERIC;
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
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_expense
  FROM transactions
  WHERE company_id = p_company_id
    AND status IN ('pending', 'scheduled')
    AND type = 'expense'
    AND is_credit_card = false
    AND date >= p_start_date
    AND date <= p_end_date;

  -- Calcular despesas de cartão de crédito cujas faturas vencem no mês vigente
  -- A fatura vence no mês se o due_day cair dentro do período
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_pending_credit_card_expense
  FROM transactions t
  INNER JOIN credit_cards cc ON t.credit_card_id = cc.id
  WHERE t.company_id = p_company_id
    AND t.status = 'pending'
    AND t.type = 'expense'
    AND t.is_credit_card = true
    -- Verifica se a data de vencimento da fatura (invoice_month + due_day) cai no período
    AND (
      -- Calcula o mês da fatura baseado na regra de fechamento
      DATE_TRUNC('month', get_invoice_period(t.date, cc.closing_day))::DATE 
      + INTERVAL '1 day' * (cc.due_day - 1)
    )::DATE >= p_start_date
    AND (
      DATE_TRUNC('month', get_invoice_period(t.date, cc.closing_day))::DATE 
      + INTERVAL '1 day' * (cc.due_day - 1)
    )::DATE <= p_end_date;

  -- Montar o resultado JSON incluindo despesas de cartão que vencem no mês
  v_result := json_build_object(
    'total_income', v_total_income,
    'total_expense', v_total_expense,
    'balance', v_total_income - v_total_expense,
    'pending_income', v_pending_income,
    'pending_expense', v_pending_expense + v_pending_credit_card_expense
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_summary IS 'Calculates dashboard summary including credit card transactions due in the current month based on invoice closing and due dates.';
