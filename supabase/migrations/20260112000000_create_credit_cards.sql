-- Create enum for credit card brands
CREATE TYPE public.credit_card_brand AS ENUM ('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners', 'discover', 'other');

-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand credit_card_brand NOT NULL DEFAULT 'other',
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  credit_limit DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add credit_card_id to transactions table
ALTER TABLE public.transactions 
ADD COLUMN credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_transactions_credit_card_id ON public.transactions(credit_card_id);
CREATE INDEX idx_credit_cards_company_id ON public.credit_cards(company_id);

-- Enable RLS on credit_cards table
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_cards
CREATE POLICY "Users can view credit cards of their companies" 
ON public.credit_cards FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.companies 
  WHERE companies.id = credit_cards.company_id 
  AND companies.user_id = auth.uid()
));

CREATE POLICY "Users can create credit cards for their companies" 
ON public.credit_cards FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.companies 
  WHERE companies.id = credit_cards.company_id 
  AND companies.user_id = auth.uid()
));

CREATE POLICY "Users can update credit cards of their companies" 
ON public.credit_cards FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.companies 
  WHERE companies.id = credit_cards.company_id 
  AND companies.user_id = auth.uid()
));

CREATE POLICY "Users can delete credit cards of their companies" 
ON public.credit_cards FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.companies 
  WHERE companies.id = credit_cards.company_id 
  AND companies.user_id = auth.uid()
));

-- Trigger for updated_at on credit_cards
CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add invoice_paid_at field to transactions for tracking when invoice was paid
ALTER TABLE public.transactions 
ADD COLUMN invoice_paid_at TIMESTAMP WITH TIME ZONE;

-- Function to calculate invoice period for a transaction based on credit card closing day
CREATE OR REPLACE FUNCTION public.get_invoice_period(
  transaction_date DATE,
  closing_day INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  invoice_month DATE;
BEGIN
  -- If transaction is after closing day, invoice is for next month
  IF EXTRACT(DAY FROM transaction_date) > closing_day THEN
    invoice_month := DATE_TRUNC('month', transaction_date + INTERVAL '1 month');
  ELSE
    invoice_month := DATE_TRUNC('month', transaction_date);
  END IF;
  
  RETURN invoice_month;
END;
$$;

-- Function to pay credit card invoice (marks all transactions of a period as paid)
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
BEGIN
  -- Get closing day for the credit card
  SELECT closing_day INTO v_closing_day
  FROM public.credit_cards
  WHERE id = p_credit_card_id;
  
  -- Update transactions to paid status
  UPDATE public.transactions
  SET 
    status = 'paid',
    paid_at = CURRENT_TIMESTAMP,
    invoice_paid_at = CURRENT_TIMESTAMP
  WHERE 
    credit_card_id = p_credit_card_id
    AND get_invoice_period(date, v_closing_day) = p_invoice_month
    AND status = 'pending';
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;

-- Function to reopen credit card invoice (marks all transactions of a period as pending)
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
  
  -- Update transactions to pending status
  UPDATE public.transactions
  SET 
    status = 'pending',
    paid_at = NULL,
    invoice_paid_at = NULL
  WHERE 
    credit_card_id = p_credit_card_id
    AND get_invoice_period(date, v_closing_day) = p_invoice_month
    AND invoice_paid_at IS NOT NULL;
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;

-- View for credit card invoices grouped by month
CREATE OR REPLACE VIEW public.credit_card_invoices AS
SELECT 
  cc.id as credit_card_id,
  cc.company_id,
  cc.name as credit_card_name,
  cc.brand,
  cc.closing_day,
  cc.due_day,
  get_invoice_period(t.date, cc.closing_day) as invoice_month,
  COUNT(t.id) as transaction_count,
  SUM(t.amount) as total_amount,
  BOOL_AND(t.status = 'paid') as is_paid,
  MIN(t.invoice_paid_at) as paid_at
FROM public.credit_cards cc
LEFT JOIN public.transactions t ON t.credit_card_id = cc.id AND t.is_credit_card = true
GROUP BY cc.id, cc.company_id, cc.name, cc.brand, cc.closing_day, cc.due_day, invoice_month;
