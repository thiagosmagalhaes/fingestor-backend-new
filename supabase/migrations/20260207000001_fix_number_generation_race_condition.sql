-- ================================================================
-- FIX: Race Condition na Geração de Números de Orçamento e Venda
-- ================================================================
-- Problema: Múltiplas requisições simultâneas podem gerar números duplicados
-- Solução: Tabela de sequências com row-level locks
-- ================================================================

BEGIN;

-- Criar tabela de sequências para controlar numeração
CREATE TABLE IF NOT EXISTS number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sequence_type VARCHAR(20) NOT NULL CHECK (sequence_type IN ('budget', 'sale')),
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, sequence_type, year)
);

CREATE INDEX idx_number_sequences_lookup ON number_sequences(company_id, sequence_type, year);

COMMENT ON TABLE number_sequences IS 'Controla sequências de numeração com proteção contra race conditions';

-- Função corrigida: generate_budget_number (thread-safe)
CREATE OR REPLACE FUNCTION generate_budget_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  current_year INTEGER;
  year_suffix VARCHAR(4);
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Inserir ou atualizar a sequência com lock (previne race condition)
  INSERT INTO number_sequences (company_id, sequence_type, year, last_number)
  VALUES (p_company_id, 'budget', current_year, 1)
  ON CONFLICT (company_id, sequence_type, year)
  DO UPDATE SET 
    last_number = number_sequences.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_number;
  
  RETURN 'ORC-' || year_suffix || '-' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Função corrigida: generate_sale_number (thread-safe)
CREATE OR REPLACE FUNCTION generate_sale_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  current_year INTEGER;
  year_suffix VARCHAR(4);
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Inserir ou atualizar a sequência com lock (previne race condition)
  INSERT INTO number_sequences (company_id, sequence_type, year, last_number)
  VALUES (p_company_id, 'sale', current_year, 1)
  ON CONFLICT (company_id, sequence_type, year)
  DO UPDATE SET 
    last_number = number_sequences.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_number;
  
  RETURN 'VEN-' || year_suffix || '-' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Migrar dados existentes para a tabela de sequências
-- Para cada empresa, calcular o último número usado em cada ano
INSERT INTO number_sequences (company_id, sequence_type, year, last_number)
SELECT 
  b.company_id,
  'budget' as sequence_type,
  EXTRACT(YEAR FROM b.created_at)::INTEGER as year,
  MAX(CAST(SUBSTRING(b.budget_number FROM '\d+$') AS INTEGER)) as last_number
FROM budgets b
WHERE b.deleted_at IS NULL
  AND b.budget_number ~ '^ORC-\d{4}-\d+$'
GROUP BY b.company_id, EXTRACT(YEAR FROM b.created_at)
ON CONFLICT (company_id, sequence_type, year) DO NOTHING;

INSERT INTO number_sequences (company_id, sequence_type, year, last_number)
SELECT 
  s.company_id,
  'sale' as sequence_type,
  EXTRACT(YEAR FROM s.created_at)::INTEGER as year,
  MAX(CAST(SUBSTRING(s.sale_number FROM '\d+$') AS INTEGER)) as last_number
FROM sales s
WHERE s.deleted_at IS NULL
  AND s.sale_number ~ '^VEN-\d{4}-\d+$'
GROUP BY s.company_id, EXTRACT(YEAR FROM s.created_at)
ON CONFLICT (company_id, sequence_type, year) DO NOTHING;

-- RLS Policies
ALTER TABLE number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view number_sequences of their companies"
  ON number_sequences FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Apenas funções do sistema devem modificar as sequências
-- (INSERT/UPDATE são feitos via funções generate_budget_number e generate_sale_number)

COMMIT;
