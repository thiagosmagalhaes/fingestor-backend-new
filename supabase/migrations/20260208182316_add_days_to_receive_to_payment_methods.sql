-- ================================================================
-- ADICIONAR COLUNA DAYS_TO_RECEIVE EM PAYMENT_METHODS
-- ================================================================
-- Esta coluna indica em quantos dias o valor da venda será recebido
-- ao usar este método de pagamento (D+N)
-- Exemplos: 
--   0 = recebe no mesmo dia (dinheiro, PIX)
--   1 = recebe no próximo dia útil (débito)
--   30 = recebe em 30 dias (crédito à vista)

ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS days_to_receive INTEGER DEFAULT 0 NOT NULL;

-- Adicionar comentário
COMMENT ON COLUMN payment_methods.days_to_receive IS 'Número de dias até o recebimento do valor (D+N). Zero indica recebimento imediato.';

-- Atualizar valores padrão para métodos existentes baseado no tipo
-- Dinheiro e PIX: recebimento imediato (0 dias)
UPDATE payment_methods
SET days_to_receive = 0
WHERE type IN ('cash', 'pix') AND days_to_receive = 0;

-- Cartões de débito: geralmente D+1
UPDATE payment_methods
SET days_to_receive = 1
WHERE type = 'card' AND card_type = 'debit' AND days_to_receive = 0;

-- Cartões de crédito: geralmente D+30
UPDATE payment_methods
SET days_to_receive = 30
WHERE type = 'card' AND card_type = 'credit' AND days_to_receive = 0;

-- Outros: manter 0 por padrão
UPDATE payment_methods
SET days_to_receive = 0
WHERE type = 'other' AND days_to_receive = 0;
