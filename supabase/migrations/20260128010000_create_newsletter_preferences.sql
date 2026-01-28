-- Tabela para preferencias de newsletter dos usuarios
CREATE TABLE IF NOT EXISTS newsletter_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscribed BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Indice para busca rapida por email
CREATE INDEX idx_newsletter_preferences_email ON newsletter_preferences(email);
CREATE INDEX idx_newsletter_preferences_subscribed ON newsletter_preferences(subscribed);

-- RLS (Row Level Security)
ALTER TABLE newsletter_preferences ENABLE ROW LEVEL SECURITY;

-- Politica: usuarios podem ver apenas suas proprias preferencias
CREATE POLICY "Users can view own newsletter preferences"
  ON newsletter_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politica: usuarios podem atualizar apenas suas proprias preferencias
CREATE POLICY "Users can update own newsletter preferences"
  ON newsletter_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Politica: sistema pode inserir preferencias
CREATE POLICY "System can insert newsletter preferences"
  ON newsletter_preferences
  FOR INSERT
  WITH CHECK (true);

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_newsletter_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_newsletter_preferences_updated_at_trigger
  BEFORE UPDATE ON newsletter_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_preferences_updated_at();

-- Funcao para verificar se usuario esta inscrito
CREATE OR REPLACE FUNCTION is_subscribed_to_newsletter(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscribed BOOLEAN;
BEGIN
  SELECT subscribed INTO v_subscribed
  FROM newsletter_preferences
  WHERE user_id = p_user_id;
  
  -- Se nao existe registro, considera inscrito por padrao
  RETURN COALESCE(v_subscribed, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
