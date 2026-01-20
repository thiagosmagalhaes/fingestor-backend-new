-- Create a function to get the effective date for sorting transactions
-- This returns payment_date if paid, or date as fallback
CREATE OR REPLACE FUNCTION public.get_effective_date(
  p_status TEXT,
  p_payment_date TIMESTAMP WITH TIME ZONE,
  p_date TIMESTAMP WITH TIME ZONE
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- If paid, use payment date
  IF p_status = 'paid' AND p_payment_date IS NOT NULL THEN
    RETURN p_payment_date;
  END IF;
  
  -- Otherwise use transaction date
  RETURN p_date;
END;
$$;

COMMENT ON FUNCTION public.get_effective_date IS 'Returns the most relevant date for a transaction: payment_date if paid, or date as fallback. Used for proper chronological sorting.';
