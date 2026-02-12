-- Adicionar campos de contato do emitente à tabela fiscal_config
ALTER TABLE public.fiscal_config
  ADD COLUMN IF NOT EXISTS emitente_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS emitente_fone VARCHAR(20);

COMMENT ON COLUMN public.fiscal_config.emitente_email IS 'Email do emitente para contato';
COMMENT ON COLUMN public.fiscal_config.emitente_fone IS 'Telefone do emitente para contato';
