-- ================================================================
-- TABELA DE FORMAS DE PAGAMENTO CUSTOMIZÁVEIS PARA PDV
-- ================================================================

-- Tabela: payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- Ex: Dinheiro, PIX, Cartão Visa Débito, Cartão Mastercard Crédito
  type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'pix', 'card', 'other')),
  -- Para cartões: tipo de cartão
  card_type VARCHAR(20) CHECK (card_type IN ('debit', 'credit', 'both') OR card_type IS NULL),
  -- Para cartões: bandeira
  card_brand VARCHAR(50), -- Ex: Visa, Mastercard, Elo, Amex, etc
  -- Taxas
  fee_percentage DECIMAL(5, 2) DEFAULT 0, -- Taxa percentual (ex: 2.5%)
  fee_fixed_amount DECIMAL(15, 2) DEFAULT 0, -- Taxa fixa em valor (ex: R$ 0,50)
  -- Taxas específicas por número de parcelas (para cartões)
  installment_fees JSONB DEFAULT '{}', -- Ex: {"1": 2.5, "2": 3.0, "3": 3.5, "12": 5.0}
  -- Configurações
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Apenas uma forma de pagamento pode ser padrão por empresa
  allow_installments BOOLEAN DEFAULT false, -- Permite parcelamento
  max_installments INTEGER DEFAULT 1, -- Número máximo de parcelas
  min_installment_amount DECIMAL(15, 2) DEFAULT 0, -- Valor mínimo por parcela
  -- Ordenação para exibição
  display_order INTEGER DEFAULT 0,
  -- Metadados adicionais
  metadata JSONB DEFAULT '{}',
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_payment_methods_company_id ON payment_methods(company_id);
CREATE INDEX idx_payment_methods_type ON payment_methods(type);
CREATE INDEX idx_payment_methods_is_active ON payment_methods(is_active);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default);
CREATE INDEX idx_payment_methods_display_order ON payment_methods(display_order);

-- Comentário
COMMENT ON TABLE payment_methods IS 'Formas de pagamento customizáveis por empresa para o PDV';

-- Trigger para updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- FUNÇÃO PARA GARANTIR APENAS UM MÉTODO PADRÃO POR EMPRESA
-- ================================================================

CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o novo registro está sendo marcado como padrão
  IF NEW.is_default = true THEN
    -- Remover is_default de todos os outros métodos da mesma empresa
    UPDATE payment_methods
    SET is_default = false, updated_at = NOW()
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para garantir apenas um método padrão
CREATE TRIGGER trigger_ensure_single_default_payment_method
  BEFORE INSERT OR UPDATE ON payment_methods
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- ================================================================
-- INSERIR FORMA DE PAGAMENTO PADRÃO (DINHEIRO) PARA EMPRESAS EXISTENTES
-- ================================================================

-- Esta função adiciona "Dinheiro" como forma de pagamento padrão para todas as empresas
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    -- Verifica se a empresa já tem alguma forma de pagamento
    IF NOT EXISTS (
      SELECT 1 FROM payment_methods 
      WHERE company_id = company_record.id
    ) THEN
      -- Insere "Dinheiro" como padrão
      INSERT INTO payment_methods (
        company_id,
        name,
        type,
        is_active,
        is_default,
        display_order
      ) VALUES (
        company_record.id,
        'Dinheiro',
        'cash',
        true,
        true,
        0
      );
    END IF;
  END LOOP;
END $$;

-- ================================================================
-- TRIGGER PARA ADICIONAR "DINHEIRO" AO CRIAR NOVA EMPRESA
-- ================================================================

CREATE OR REPLACE FUNCTION create_default_payment_method_for_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir "Dinheiro" como forma de pagamento padrão
  INSERT INTO payment_methods (
    company_id,
    name,
    type,
    is_active,
    is_default,
    display_order
  ) VALUES (
    NEW.id,
    'Dinheiro',
    'cash',
    true,
    true,
    0
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que executa após criação de empresa
CREATE TRIGGER trigger_create_default_payment_method
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_default_payment_method_for_company();

-- ================================================================
-- POLÍTICA RLS (ROW LEVEL SECURITY)
-- ================================================================

-- Habilitar RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: usuários podem ver formas de pagamento das suas empresas
CREATE POLICY payment_methods_select_policy ON payment_methods
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política de INSERT: usuários podem criar formas de pagamento nas suas empresas
CREATE POLICY payment_methods_insert_policy ON payment_methods
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política de UPDATE: usuários podem atualizar formas de pagamento das suas empresas
CREATE POLICY payment_methods_update_policy ON payment_methods
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Política de DELETE: usuários podem deletar (soft delete) formas de pagamento das suas empresas
CREATE POLICY payment_methods_delete_policy ON payment_methods
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT ALL ON payment_methods TO authenticated;
