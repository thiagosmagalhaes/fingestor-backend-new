-- Add type column to companies table
-- Type can be 'empresa' (company) or 'pessoal' (personal)

-- Create enum for account type
CREATE TYPE public.account_type AS ENUM ('empresa', 'pessoal');

-- Add type column to companies table with default value 'empresa'
ALTER TABLE public.companies 
ADD COLUMN type account_type NOT NULL DEFAULT 'empresa';

-- Create index for better performance on type queries
CREATE INDEX idx_companies_type ON public.companies(type);

-- Update existing companies based on CNPJ length
-- CPF (11 digits) = pessoal, CNPJ (14 digits) = empresa
UPDATE public.companies
SET type = CASE
  WHEN cnpj IS NOT NULL AND LENGTH(REGEXP_REPLACE(cnpj, '[^0-9]', '', 'g')) = 11 THEN 'pessoal'::account_type
  ELSE 'empresa'::account_type
END;
