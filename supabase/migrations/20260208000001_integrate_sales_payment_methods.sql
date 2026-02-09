-- ================================================================
-- INTEGRAÇÃO: Sales com Payment Methods
-- ================================================================

-- Adicionar campo payment_method_id na tabela sales
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL;

-- Adicionar campo payment_method_id na tabela payment_installments
ALTER TABLE payment_installments
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_sales_payment_method_id ON sales(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_payment_method_id ON payment_installments(payment_method_id);

-- Comentários
COMMENT ON COLUMN sales.payment_method_id IS 'Referência à forma de pagamento customizável (opcional, mantém payment_method como string por compatibilidade)';
COMMENT ON COLUMN payment_installments.payment_method_id IS 'Referência à forma de pagamento customizável (opcional, mantém payment_method como string por compatibilidade)';

-- ================================================================
-- FUNÇÃO AUXILIAR: Obter informações da forma de pagamento
-- ================================================================

CREATE OR REPLACE FUNCTION get_payment_method_info(
  p_sale_id UUID
)
RETURNS TABLE (
  payment_method_id UUID,
  payment_method_name VARCHAR,
  payment_method_type VARCHAR,
  fee_percentage DECIMAL,
  fee_fixed_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.name,
    pm.type,
    pm.fee_percentage,
    pm.fee_fixed_amount
  FROM sales s
  LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
  WHERE s.id = p_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_payment_method_info TO authenticated;

COMMENT ON FUNCTION get_payment_method_info IS 'Retorna informações da forma de pagamento de uma venda';
