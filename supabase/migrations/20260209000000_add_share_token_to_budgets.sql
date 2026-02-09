-- Adicionar share_token ao budgets para permitir compartilhamento público
ALTER TABLE budgets 
ADD COLUMN share_token VARCHAR(64) UNIQUE;

-- Criar índice para consultas rápidas por share_token
CREATE INDEX idx_budgets_share_token ON budgets(share_token);

-- Função para gerar share token automaticamente
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(64) AS $$
DECLARE
  token VARCHAR(64);
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar token aleatório de 64 caracteres usando MD5
    -- Concatena dois MD5 para obter 64 caracteres
    token := md5(random()::text || clock_timestamp()::text || random()::text) || 
             md5(random()::text || clock_timestamp()::text || random()::text);
    
    -- Verificar se o token já existe
    SELECT EXISTS(SELECT 1 FROM budgets WHERE share_token = token) INTO token_exists;
    
    -- Se não existe, retornar
    IF NOT token_exists THEN
      RETURN token;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar share_token ao criar orçamento
CREATE OR REPLACE FUNCTION auto_generate_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := generate_share_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para gerar share_token automaticamente
CREATE TRIGGER trigger_auto_generate_share_token
BEFORE INSERT ON budgets
FOR EACH ROW
EXECUTE FUNCTION auto_generate_share_token();

-- Atualizar orçamentos existentes com share_token
UPDATE budgets
SET share_token = generate_share_token()
WHERE share_token IS NULL AND deleted_at IS NULL;

COMMENT ON COLUMN budgets.share_token IS 'Token único para compartilhamento público do orçamento';
