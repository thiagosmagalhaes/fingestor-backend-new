-- Update pay_credit_card_invoice function to use payment_date
CREATE OR REPLACE FUNCTION public.pay_credit_card_invoice(
  p_credit_card_id UUID,
  p_invoice_month DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closing_day INTEGER;
  v_affected_rows INTEGER;
  v_payment_date TIMESTAMP WITH TIME ZONE;
BEGIN
  v_payment_date := CURRENT_TIMESTAMP;
  
  -- Get closing day for the credit card
  SELECT closing_day INTO v_closing_day
  FROM public.credit_cards
  WHERE id = p_credit_card_id;
  
  -- Update transactions to paid status
  -- Now we set payment_date to current date (when invoice is paid)
  -- and keep date as the original purchase date
  UPDATE public.transactions
  SET 
    status = 'paid',
    paid_at = v_payment_date,
    payment_date = v_payment_date,
    invoice_paid_at = v_payment_date
  WHERE 
    credit_card_id = p_credit_card_id
    AND get_invoice_period(date, v_closing_day) = p_invoice_month
    AND status = 'pending';
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;

-- Update reopen_credit_card_invoice function to clear payment_date
CREATE OR REPLACE FUNCTION public.reopen_credit_card_invoice(
  p_credit_card_id UUID,
  p_invoice_month DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closing_day INTEGER;
  v_affected_rows INTEGER;
BEGIN
  -- Get closing day for the credit card
  SELECT closing_day INTO v_closing_day
  FROM public.credit_cards
  WHERE id = p_credit_card_id;
  
  -- Update transactions to pending status and clear payment_date
  UPDATE public.transactions
  SET 
    status = 'pending',
    paid_at = NULL,
    payment_date = NULL,
    invoice_paid_at = NULL
  WHERE 
    credit_card_id = p_credit_card_id
    AND get_invoice_period(date, v_closing_day) = p_invoice_month
    AND invoice_paid_at IS NOT NULL;
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;
