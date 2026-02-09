-- Tabela de sessões de caixa (abertura e fechamento de caixa)
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  
  -- Valores de abertura
  opening_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  opening_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Valores de fechamento
  closing_amount DECIMAL(15, 2),
  closing_date TIMESTAMPTZ,
  
  -- Status da sessão
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  
  -- Notas/observações
  opening_notes TEXT,
  closing_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_cash_sessions_company_id ON cash_sessions(company_id);
CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX idx_cash_sessions_company_status ON cash_sessions(company_id, status);
CREATE INDEX idx_cash_sessions_opening_date ON cash_sessions(opening_date);

-- RLS policies
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ler as sessões de caixa de suas empresas
CREATE POLICY "Users can read cash sessions of their companies"
  ON cash_sessions FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Usuários podem criar sessões de caixa para suas empresas
CREATE POLICY "Users can create cash sessions for their companies"
  ON cash_sessions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Usuários podem atualizar sessões de caixa de suas empresas
CREATE POLICY "Users can update cash sessions of their companies"
  ON cash_sessions FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_cash_sessions_updated_at
  BEFORE UPDATE ON cash_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para obter sessão de caixa aberta
CREATE OR REPLACE FUNCTION get_open_cash_session(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  opened_by UUID,
  opening_amount DECIMAL(15, 2),
  opening_date TIMESTAMPTZ,
  opening_notes TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.company_id,
    cs.opened_by,
    cs.opening_amount,
    cs.opening_date,
    cs.opening_notes,
    cs.status,
    cs.created_at,
    cs.updated_at
  FROM cash_sessions cs
  WHERE cs.company_id = p_company_id 
    AND cs.status = 'open'
  ORDER BY cs.opening_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar campo cash_session_id à tabela sales (opcional mas recomendado para auditoria)
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS cash_session_id UUID REFERENCES cash_sessions(id);

CREATE INDEX IF NOT EXISTS idx_sales_cash_session_id ON sales(cash_session_id);

-- Comentários nas tabelas e colunas
COMMENT ON TABLE cash_sessions IS 'Sessões de abertura e fechamento de caixa para PDV';
COMMENT ON COLUMN cash_sessions.opening_amount IS 'Valor inicial de dinheiro no caixa';
COMMENT ON COLUMN cash_sessions.closing_amount IS 'Valor final de dinheiro informado no fechamento';
COMMENT ON COLUMN cash_sessions.status IS 'Status da sessão: open ou closed';
