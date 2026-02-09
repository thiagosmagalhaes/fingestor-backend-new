-- ================================================================
-- FIX: Criar transação apenas após calcular total da venda
-- ================================================================
-- O problema era que a transação estava sendo criada no INSERT
-- quando total_amount = 0, antes dos itens serem inseridos.
-- Agora cria apenas no UPDATE quando o total é calculado.

-- Remover trigger antigo de INSERT
DROP TRIGGER IF EXISTS trigger_auto_create_transaction_from_sale ON sales;

-- Recriar função do trigger para verificar se já existe transação
CREATE OR REPLACE FUNCTION trigger_create_transaction_from_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_exists BOOLEAN;
BEGIN
  -- Apenas criar transação se:
  -- 1. payment_method_id está presente
  -- 2. status não é 'draft' ou 'cancelled'
  -- 3. payment_status é 'paid' ou 'partial'
  -- 4. total_amount > 0 (novo no UPDATE)
  -- 5. Ainda não existe transação para esta venda
  
  IF NEW.payment_method_id IS NOT NULL 
     AND NEW.status NOT IN ('draft', 'cancelled') 
     AND NEW.payment_status IN ('paid', 'partial')
     AND NEW.total_amount > 0 THEN
    
    -- Verificar se já existe uma transação para esta venda
    SELECT EXISTS(
      SELECT 1 FROM transactions WHERE sale_id = NEW.id
    ) INTO v_transaction_exists;
    
    -- Só criar se não existir
    IF NOT v_transaction_exists THEN
      PERFORM create_transaction_from_sale(
        NEW.id,
        NEW.company_id,
        NEW.total_amount,
        NEW.payment_method_id,
        NEW.sale_date
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger apenas para UPDATE (quando total_amount é calculado)
CREATE TRIGGER trigger_auto_create_transaction_from_sale
  AFTER UPDATE ON sales
  FOR EACH ROW
  WHEN (OLD.total_amount IS DISTINCT FROM NEW.total_amount AND NEW.total_amount > 0)
  EXECUTE FUNCTION trigger_create_transaction_from_sale();

COMMENT ON TRIGGER trigger_auto_create_transaction_from_sale ON sales IS 'Cria automaticamente uma transação financeira quando o total da venda é calculado (após inserir itens)';

