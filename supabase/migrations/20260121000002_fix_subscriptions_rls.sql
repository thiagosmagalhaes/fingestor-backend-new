-- Remover política restritiva de service_role e adicionar política para backend operations
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscriptions;

-- Permitir que o backend (usando anon key) possa inserir subscriptions via webhooks
CREATE POLICY "Backend can insert subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Permitir que o backend possa atualizar qualquer subscription
CREATE POLICY "Backend can update subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Permitir que o backend possa deletar subscriptions (caso necessário)
CREATE POLICY "Backend can delete subscriptions"
  ON subscriptions
  FOR DELETE
  USING (true);
