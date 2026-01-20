-- Add payment_date column to transactions table
-- This stores the actual date when money leaves/enters the account
-- Different from 'date' which stores the transaction/purchase date
ALTER TABLE public.transactions 
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on payment_date queries
CREATE INDEX idx_transactions_payment_date ON public.transactions(payment_date);

-- Update existing paid transactions to have payment_date = paid_at
UPDATE public.transactions
SET payment_date = paid_at
WHERE status = 'paid' AND paid_at IS NOT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.transactions.payment_date IS 'Actual date when the money was debited/credited from the account. For credit cards, this is when the invoice was paid, not when the purchase was made.';
