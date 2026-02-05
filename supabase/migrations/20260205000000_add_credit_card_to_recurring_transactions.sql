-- Add credit card support to recurring transactions
ALTER TABLE recurring_transactions 
ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
ADD COLUMN is_credit_card BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_recurring_transactions_credit_card_id ON recurring_transactions(credit_card_id);

-- Add comments
COMMENT ON COLUMN recurring_transactions.credit_card_id IS 'Optional credit card for recurring expenses';
COMMENT ON COLUMN recurring_transactions.is_credit_card IS 'Whether this recurring transaction is linked to a credit card';
