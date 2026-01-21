-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('mensal', 'semestral', 'anual')),
  price_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: service role can do everything (for backend operations)
CREATE POLICY "Service role can manage all subscriptions"
  ON subscriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_subscriptions_updated_at_trigger
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Create RPC function to get user subscription status
-- Retorna status da assinatura OU período de trial gratuito de 15 dias
CREATE OR REPLACE FUNCTION get_user_subscription()
RETURNS TABLE (
  id UUID,
  plan_type TEXT,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  trial_days_remaining INTEGER,
  requires_subscription BOOLEAN,
  warning_subscription BOOLEAN
) 
SECURITY DEFINER
AS $$
DECLARE
  user_created_at TIMESTAMPTZ;
  days_since_creation INTEGER;
  subscription_record RECORD;
BEGIN
  -- Buscar data de criação do usuário
  SELECT created_at INTO user_created_at
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Calcular dias desde a criação
  days_since_creation := EXTRACT(DAY FROM (NOW() - user_created_at))::INTEGER;
  
  -- Buscar assinatura ativa do usuário
  SELECT 
    s.id,
    s.plan_type,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end
  INTO subscription_record
  FROM subscriptions s
  WHERE s.user_id = auth.uid()
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Se tem assinatura ativa, retornar ela
  IF subscription_record.id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      subscription_record.id,
      subscription_record.plan_type,
      subscription_record.status,
      subscription_record.current_period_start,
      subscription_record.current_period_end,
      subscription_record.cancel_at_period_end,
      0 as trial_days_remaining,
      FALSE as requires_subscription,
      FALSE as warning_subscription;
    RETURN;
  END IF;
  
  -- Não tem assinatura ativa - verificar período de trial de 15 dias
  IF days_since_creation < 15 THEN
    -- Ainda está no período de trial
    RETURN QUERY
    SELECT 
      NULL::UUID as id,
      NULL::TEXT as plan_type,
      'trial_period'::TEXT as status,
      user_created_at as current_period_start,
      (user_created_at + INTERVAL '15 days')::TIMESTAMPTZ as current_period_end,
      FALSE as cancel_at_period_end,
      (15 - days_since_creation)::INTEGER as trial_days_remaining,
      FALSE as requires_subscription,
      CASE WHEN (15 - days_since_creation) <= 3 THEN TRUE ELSE FALSE END as warning_subscription;
    RETURN;
  END IF;
  
  -- Trial expirado e sem assinatura
  RETURN QUERY
  SELECT 
    NULL::UUID as id,
    NULL::TEXT as plan_type,
    'trial_expired'::TEXT as status,
    user_created_at as current_period_start,
    (user_created_at + INTERVAL '15 days')::TIMESTAMPTZ as current_period_end,
    FALSE as cancel_at_period_end,
    0 as trial_days_remaining,
    TRUE as requires_subscription,
    TRUE as warning_subscription;
END;
$$ LANGUAGE plpgsql;
