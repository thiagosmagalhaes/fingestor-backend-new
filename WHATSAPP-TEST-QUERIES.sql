-- ============================================
-- WhatsApp Activation System - Test Queries
-- ============================================

-- ============================================
-- 1. VERIFICAÇÃO INICIAL
-- ============================================

-- Ver estrutura da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_message_queue'
ORDER BY ordinal_position;

-- Ver constraints e indexes
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'whatsapp_message_queue'::regclass;

-- ============================================
-- 2. QUERIES DE MONITORAMENTO
-- ============================================

-- Dashboard geral
SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM whatsapp_message_queue
GROUP BY status;

-- Mensagens por tipo
SELECT 
  message_key,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM whatsapp_message_queue
GROUP BY message_key
ORDER BY message_key;

-- Últimas 20 mensagens
SELECT 
  message_key,
  phone,
  status,
  scheduled_for,
  sent_at,
  created_at
FROM whatsapp_message_queue
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 3. QUERIES DE DEBUG
-- ============================================

-- Usuários com telefone mas sem mensagens
SELECT 
  p.id,
  p.phone,
  p.created_at,
  AGE(NOW(), p.created_at) as age
FROM profiles p
WHERE p.phone IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM whatsapp_message_queue WHERE user_id = p.id
)
ORDER BY p.created_at DESC;

-- Mensagens vencidas não enviadas
SELECT 
  message_key,
  phone,
  scheduled_for,
  AGE(NOW(), scheduled_for) as overdue_by,
  created_at
FROM whatsapp_message_queue
WHERE status = 'pending'
AND scheduled_for < NOW()
ORDER BY scheduled_for;

-- Estatísticas de um usuário específico
SELECT 
  p.id,
  p.phone,
  p.created_at as user_created,
  (SELECT COUNT(*) FROM accounts WHERE user_id = p.id) as accounts,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.id) as transactions,
  (
    SELECT json_agg(
      json_build_object(
        'message_key', message_key,
        'status', status,
        'scheduled_for', scheduled_for,
        'sent_at', sent_at
      ) ORDER BY created_at
    )
    FROM whatsapp_message_queue 
    WHERE user_id = p.id
  ) as messages
FROM profiles p
WHERE p.id = 'USER_UUID_HERE'; -- SUBSTITUIR

-- ============================================
-- 4. ANÁLISE DE PERFORMANCE
-- ============================================

-- Tempo médio entre agendamento e envio
SELECT 
  message_key,
  COUNT(*) as sent_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (sent_at - scheduled_for)) / 60), 2) as avg_minutes_delay,
  ROUND(MIN(EXTRACT(EPOCH FROM (sent_at - scheduled_for)) / 60), 2) as min_minutes,
  ROUND(MAX(EXTRACT(EPOCH FROM (sent_at - scheduled_for)) / 60), 2) as max_minutes
FROM whatsapp_message_queue
WHERE status = 'sent'
GROUP BY message_key
ORDER BY message_key;

-- Taxa de conversão por mensagem
SELECT 
  message_key,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'sent') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / NULLIF(COUNT(*), 0), 
    2
  ) as failure_rate_percent
FROM whatsapp_message_queue
WHERE status IN ('sent', 'failed')
GROUP BY message_key
ORDER BY failure_rate_percent DESC;

-- Volume de mensagens por dia
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as messages_sent,
  COUNT(DISTINCT user_id) as unique_users
FROM whatsapp_message_queue
WHERE status = 'sent'
GROUP BY DATE(sent_at)
ORDER BY date DESC
LIMIT 30;

-- ============================================
-- 5. TESTES DE AGENDAMENTO MANUAL
-- ============================================

-- Simular agendamento de welcome message para um usuário
-- ATENÇÃO: Substituir USER_ID e PHONE
INSERT INTO whatsapp_message_queue (
  user_id,
  phone,
  message_key,
  message_body,
  scheduled_for,
  status
) VALUES (
  'USER_UUID_HERE', -- SUBSTITUIR
  '+5511999999999',  -- SUBSTITUIR
  'welcome_10min',
  'Oi! Aqui é o Thiago, do Fingestor 👋

Vi que você acabou de se cadastrar no sistema.
O Fingestor foi feito pra organizar tanto finanças pessoais quanto de empresa, tudo no mesmo lugar, sem complicação.

Qualquer dúvida no começo, pode me chamar por aqui 😉',
  NOW() + INTERVAL '1 minute', -- Enviar em 1 minuto
  'pending'
);

-- ============================================
-- 6. LIMPEZA E MANUTENÇÃO
-- ============================================

-- Ver mensagens antigas (mais de 30 dias)
SELECT 
  status,
  COUNT(*) as count
FROM whatsapp_message_queue
WHERE created_at < NOW() - INTERVAL '30 days'
GROUP BY status;

-- Deletar mensagens de teste antigas (CUIDADO!)
-- DELETE FROM whatsapp_message_queue
-- WHERE created_at < NOW() - INTERVAL '30 days'
-- AND status = 'sent';

-- Resetar mensagens falhadas para retry (CUIDADO!)
-- UPDATE whatsapp_message_queue
-- SET status = 'pending', sent_at = NULL
-- WHERE status = 'failed'
-- AND created_at > NOW() - INTERVAL '24 hours';

-- ============================================
-- 7. ANÁLISE DE ATIVAÇÃO
-- ============================================

-- Usuários que receberam welcome mas não criaram conta
SELECT 
  p.id,
  p.phone,
  p.created_at as user_created,
  wmq.sent_at as welcome_sent,
  (SELECT COUNT(*) FROM accounts WHERE user_id = p.id) as accounts_count
FROM profiles p
INNER JOIN whatsapp_message_queue wmq ON wmq.user_id = p.id
WHERE wmq.message_key = 'welcome_10min'
AND wmq.status = 'sent'
AND (SELECT COUNT(*) FROM accounts WHERE user_id = p.id) = 0
ORDER BY wmq.sent_at DESC;

-- Usuários que criaram conta após receber create_account_24h
SELECT 
  p.id,
  p.phone,
  wmq.sent_at as message_sent,
  a.created_at as account_created,
  EXTRACT(EPOCH FROM (a.created_at - wmq.sent_at)) / 3600 as hours_after_message
FROM profiles p
INNER JOIN whatsapp_message_queue wmq ON wmq.user_id = p.id
INNER JOIN accounts a ON a.user_id = p.id
WHERE wmq.message_key = 'create_account_24h'
AND wmq.status = 'sent'
AND a.created_at > wmq.sent_at
ORDER BY hours_after_message;

-- ============================================
-- 8. EXPORTAR DADOS PARA ANÁLISE
-- ============================================

-- Exportar relatório completo (copiar resultado)
SELECT 
  wmq.user_id,
  p.phone,
  p.created_at as user_created,
  wmq.message_key,
  wmq.status,
  wmq.scheduled_for,
  wmq.sent_at,
  EXTRACT(EPOCH FROM (wmq.sent_at - wmq.scheduled_for)) / 60 as delay_minutes,
  (SELECT COUNT(*) FROM accounts WHERE user_id = p.id) as user_accounts,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.id) as user_transactions
FROM whatsapp_message_queue wmq
INNER JOIN profiles p ON p.id = wmq.user_id
ORDER BY wmq.created_at DESC;

-- ============================================
-- 9. HEALTH CHECK
-- ============================================

-- Verificar se há mensagens travadas (pendentes há mais de 1 hora após scheduled_for)
SELECT 
  COUNT(*) as stuck_messages,
  MIN(scheduled_for) as oldest_scheduled
FROM whatsapp_message_queue
WHERE status = 'pending'
AND scheduled_for < NOW() - INTERVAL '1 hour';

-- Verificar se jobs estão rodando (baseado em atividade recente)
SELECT 
  CASE 
    WHEN MAX(created_at) > NOW() - INTERVAL '2 hours' THEN 'Scheduling job OK'
    ELSE 'Scheduling job MIGHT BE DOWN'
  END as scheduling_status,
  CASE
    WHEN MAX(sent_at) > NOW() - INTERVAL '10 minutes' THEN 'Processing job OK'
    WHEN COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for < NOW()) = 0 THEN 'Processing job OK (no pending)'
    ELSE 'Processing job MIGHT BE DOWN'
  END as processing_status
FROM whatsapp_message_queue;
