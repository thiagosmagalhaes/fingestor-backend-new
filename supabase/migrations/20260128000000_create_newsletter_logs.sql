-- Tabela para rastrear envios de newsletters e evitar duplicatas
CREATE TABLE IF NOT EXISTS newsletter_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  newsletter_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email VARCHAR(255) NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimizar consultas
CREATE INDEX idx_newsletter_logs_user_id ON newsletter_logs(user_id);
CREATE INDEX idx_newsletter_logs_type_sent ON newsletter_logs(newsletter_type, sent_at);
CREATE INDEX idx_newsletter_logs_user_type ON newsletter_logs(user_id, newsletter_type);

-- Comentários
COMMENT ON TABLE newsletter_logs IS 'Registro de envios de newsletters para evitar duplicatas e análise';
COMMENT ON COLUMN newsletter_logs.newsletter_type IS 'Tipo: welcome, trial_expiring, subscription_confirmed, updates, custom';
COMMENT ON COLUMN newsletter_logs.metadata IS 'Dados adicionais como message_id do Resend, dias restantes, etc.';
