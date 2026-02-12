-- Add email and fone (phone) fields to companies table for Nuvem Fiscal integration

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fone VARCHAR(20);

COMMENT ON COLUMN public.companies.email IS 'Email da empresa (obrigatório para integração com Nuvem Fiscal)';
COMMENT ON COLUMN public.companies.fone IS 'Telefone da empresa (opcional)';

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies(email);
