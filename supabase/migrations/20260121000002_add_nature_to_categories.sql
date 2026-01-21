-- Migration: Add nature column to categories table
-- Author: Sistema
-- Date: 2026-01-21
-- Description: Adiciona coluna 'nature' para categorizar despesas como COST (custos) ou EXPENSE (despesas)

-- Create ENUM type for nature
CREATE TYPE expense_nature AS ENUM ('COST', 'EXPENSE');

-- Add nature column to categories table
-- NULL is allowed because income categories won't have a nature
ALTER TABLE public.categories
ADD COLUMN nature expense_nature;

-- Update existing expense categories to have a default nature value
-- Setting all existing expense categories to 'EXPENSE' as default
UPDATE public.categories
SET nature = 'EXPENSE'
WHERE type = 'expense' AND nature IS NULL;

-- Add CHECK constraint to ensure nature is only set for expense categories
ALTER TABLE public.categories
ADD CONSTRAINT categories_nature_check 
CHECK (
  (type = 'expense' AND nature IS NOT NULL) OR 
  (type = 'income' AND nature IS NULL)
);

-- Add comment to explain the column
COMMENT ON COLUMN public.categories.nature IS 'Nature of expense: COST (custo) or EXPENSE (despesa). Only applies to expense categories.';
