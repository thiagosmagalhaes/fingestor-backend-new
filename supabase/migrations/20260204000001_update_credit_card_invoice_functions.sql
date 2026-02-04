-- Update pay_credit_card_invoice to use correct period calculation
-- Matches the logic from get_credit_card_statement function
CREATE OR REPLACE FUNCTION public.pay_credit_card_invoice(
  p_credit_card_id UUID, 
  p_invoice_month DATE
) 
RETURNS INTEGER
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_closing_day INTEGER;
  v_affected_rows INTEGER;
  v_payment_date TIMESTAMP WITH TIME ZONE;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  v_payment_date := CURRENT_TIMESTAMP;
  
  -- Get closing day for the credit card
  SELECT closing_day INTO v_closing_day
  FROM public.credit_cards
  WHERE id = p_credit_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão de crédito não encontrado';
  END IF;

  -- Calculate period: from closing_day of previous month to closing_day of invoice month (exclusive)
  -- Example: closing_day = 5, invoice_month = 2026-02-01 -> period: 2026-01-05 to 2026-02-04
  v_period_start := (DATE_TRUNC('month', p_invoice_month) - INTERVAL '1 month')::DATE + (v_closing_day - 1);
  v_period_end := (DATE_TRUNC('month', p_invoice_month))::DATE + (v_closing_day - 1);
  
  -- Update transactions to paid status
  UPDATE public.transactions
  SET 
    status = 'paid',
    paid_at = v_payment_date,
    payment_date = v_payment_date,
    invoice_paid_at = v_payment_date,
    updated_at = v_payment_date
  WHERE 
    credit_card_id = p_credit_card_id
    AND date >= v_period_start
    AND date < v_period_end;
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;

-- Update reopen_credit_card_invoice to use correct period calculation
CREATE OR REPLACE FUNCTION public.reopen_credit_card_invoice(
  p_credit_card_id UUID, 
  p_invoice_month DATE
) 
RETURNS INTEGER
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_closing_day INTEGER;
  v_affected_rows INTEGER;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Get closing day for the credit card
  SELECT closing_day INTO v_closing_day
  FROM public.credit_cards
  WHERE id = p_credit_card_id;
  
  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'Cartão de crédito não encontrado';
  END IF;

  -- Calculate period: from closing_day of previous month to closing_day of invoice month (exclusive)
  -- Example: closing_day = 5, invoice_month = 2026-02-01 -> period: 2026-01-05 to 2026-02-04
  v_period_start := (DATE_TRUNC('month', p_invoice_month) - INTERVAL '1 month')::DATE + (v_closing_day - 1);
  v_period_end := (DATE_TRUNC('month', p_invoice_month))::DATE + (v_closing_day - 1);
  
  -- Update transactions to pending status and clear payment dates
  UPDATE public.transactions
  SET 
    status = 'pending',
    paid_at = NULL,
    payment_date = NULL,
    invoice_paid_at = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    credit_card_id = p_credit_card_id
    AND date >= v_period_start
    AND date < v_period_end;
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;

COMMENT ON FUNCTION public.pay_credit_card_invoice IS 'Paga todas as transações de uma fatura de cartão de crédito. Retorna o número de transações atualizadas.';
COMMENT ON FUNCTION public.reopen_credit_card_invoice IS 'Reabre (despaga) todas as transações de uma fatura de cartão de crédito. Retorna o número de transações atualizadas.';
