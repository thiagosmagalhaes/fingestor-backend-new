-- Create enum for recurring frequency
CREATE TYPE recurring_frequency AS ENUM ('7', '15', '30');

-- Create recurring_transactions table
CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency recurring_frequency NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = indefinido (gera 1 ano)
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_date DATE,
  next_generation_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add recurring_transaction_id to transactions table
ALTER TABLE transactions 
ADD COLUMN recurring_transaction_id UUID REFERENCES recurring_transactions(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_recurring_transactions_company_id ON recurring_transactions(company_id);
CREATE INDEX idx_recurring_transactions_is_active ON recurring_transactions(is_active);
CREATE INDEX idx_recurring_transactions_next_generation_date ON recurring_transactions(next_generation_date);
CREATE INDEX idx_transactions_recurring_transaction_id ON transactions(recurring_transaction_id);

-- Enable RLS
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recurring transactions"
  ON recurring_transactions FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recurring transactions in their companies"
  ON recurring_transactions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own recurring transactions"
  ON recurring_transactions FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own recurring transactions"
  ON recurring_transactions FOR DELETE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE recurring_transactions IS 'Stores recurring transaction rules';
COMMENT ON COLUMN recurring_transactions.frequency IS 'Recurrence frequency in days: 7 (weekly), 15 (biweekly), 30 (monthly)';
COMMENT ON COLUMN recurring_transactions.end_date IS 'When to stop generating. NULL = generates 1 year from start_date';
COMMENT ON COLUMN recurring_transactions.last_generated_date IS 'Last date when transactions were generated';
COMMENT ON COLUMN recurring_transactions.next_generation_date IS 'Next date to generate transaction';
