-- ================================================================
-- ATUALIZAÇÃO: Deletar transação ao cancelar venda
-- ================================================================
-- Quando uma venda é cancelada, a transação financeira vinculada
-- também deve ser deletada do sistema

-- Recriar função cancel_sale com deleção de transações
CREATE OR REPLACE FUNCTION cancel_sale(
  p_sale_id UUID,
  p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
  v_sale RECORD;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF v_sale.status = 'cancelled' THEN RAISE EXCEPTION 'Venda já cancelada'; END IF;
  
  -- Devolver estoque
  UPDATE products_services ps
  SET current_stock = current_stock + si.quantity
  FROM sale_items si
  WHERE si.sale_id = p_sale_id
    AND si.product_service_id = ps.id
    AND ps.track_inventory = true;
  
  -- Registrar movimentações de estoque
  INSERT INTO inventory_movements (
    company_id, product_service_id, movement_type,
    quantity, previous_stock, new_stock, sale_id, notes, created_by
  )
  SELECT
    v_sale.company_id, si.product_service_id, 'return',
    si.quantity, ps.current_stock - si.quantity, ps.current_stock,
    p_sale_id, 'Cancelamento: ' || p_reason, auth.uid()
  FROM sale_items si
  JOIN products_services ps ON si.product_service_id = ps.id
  WHERE si.sale_id = p_sale_id AND ps.track_inventory = true;
  
  -- NOVO: Deletar transações vinculadas à venda
  DELETE FROM transactions
  WHERE sale_id = p_sale_id;
  
  -- Atualizar status da venda
  UPDATE sales
  SET status = 'cancelled', payment_status = 'cancelled',
      cancelled_at = NOW(), cancellation_reason = p_reason
  WHERE id = p_sale_id;
  
  -- Cancelar parcelas pendentes
  UPDATE payment_installments
  SET status = 'cancelled'
  WHERE sale_id = p_sale_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancel_sale IS 'Cancela uma venda, devolvendo estoque, deletando transações vinculadas e cancelando parcelas pendentes';

