# 🚀 Guia Rápido - WhatsApp Activation System

## Deploy e Ativação

### 1. Aplicar Migration no Supabase

```bash
# Via Supabase CLI
supabase migration up

# Ou copie e execute manualmente no Supabase Studio
# Arquivo: supabase/migrations/20260127000000_create_whatsapp_message_queue.sql
```

### 2. Restart do Backend

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

### 3. Verificar Logs

Você deve ver estas mensagens no console:

```
[WhatsApp Scheduling] Starting job...
✅ WhatsApp message scheduling job scheduled (every hour)
[WhatsApp Processing] Starting job...
✅ WhatsApp message processing job scheduled (every 5 minutes)
```

---

## Testando o Sistema

### Cenário 1: Novo Usuário (Welcome Message)

1. **Criar usuário** via signup
2. **Adicionar telefone** no perfil (formato: `+5511999999999`)
3. **Aguardar** até 1 hora (próxima execução do job de agendamento)
4. **Verificar** que mensagem foi agendada:

```sql
SELECT * FROM whatsapp_message_queue 
WHERE message_key = 'welcome_10min' 
ORDER BY created_at DESC 
LIMIT 10;
```

5. **Aguardar** até 5 minutos (próxima execução do job de processamento)
6. **Verificar** que mensagem foi enviada:

```sql
SELECT * FROM whatsapp_message_queue 
WHERE message_key = 'welcome_10min' 
AND status = 'sent'
ORDER BY sent_at DESC 
LIMIT 10;
```

### Cenário 2: Usuário Sem Conta (24h)

1. **Criar usuário** e adicionar telefone
2. **Não criar nenhuma conta**
3. **Aguardar** 24 horas + tempo dos jobs
4. **Verificar** mensagem `create_account_24h` enviada

### Cenário 3: Usuário Com Conta Mas Sem Transação (48h)

1. **Criar usuário** e adicionar telefone
2. **Criar uma conta** (pessoal ou empresa)
3. **Não criar transações**
4. **Aguardar** 48 horas + tempo dos jobs
5. **Verificar** mensagens `first_tx_48h` e `micro_win_72h` enviadas

---

## Forçar Execução Imediata (Dev/Test)

### Opção 1: Comentar o setInterval temporariamente

Em `src/jobs/whatsapp.job.ts`:

```typescript
export function startWhatsAppSchedulingJob() {
  console.log('[WhatsApp Scheduling] Starting job...');

  // Executar uma vez
  WhatsAppController.scheduleMessagesForAllUsers().catch(error => {
    console.error('[WhatsApp Scheduling] Error:', error);
  });

  // COMENTAR TEMPORARIAMENTE PARA TESTE
  // setInterval(async () => {
  //   ...
  // }, 3600000);
}
```

### Opção 2: Criar endpoint de teste (recomendado)

Adicione em `src/routes/whatsapp.routes.ts` (criar arquivo):

```typescript
import { Router } from 'router';
import { WhatsAppController } from '../controllers/whatsapp.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// APENAS PARA DEV - REMOVER EM PRODUÇÃO
router.post('/test/schedule', authenticate, async (req, res) => {
  try {
    await WhatsAppController.scheduleMessagesForAllUsers();
    res.json({ success: true, message: 'Scheduling job executed' });
  } catch (error) {
    res.status(500).json({ error: 'Scheduling failed' });
  }
});

router.post('/test/process', authenticate, async (req, res) => {
  try {
    await WhatsAppController.processPendingMessages();
    res.json({ success: true, message: 'Processing job executed' });
  } catch (error) {
    res.status(500).json({ error: 'Processing failed' });
  }
});

export default router;
```

Depois adicione no `index.ts`:

```typescript
import whatsappRoutes from './routes/whatsapp.routes';
// ...
app.use('/api/whatsapp', whatsappRoutes);
```

E chame via HTTP:

```bash
# Agendar mensagens
curl -X POST http://localhost:3001/api/whatsapp/test/schedule \
  -H "Authorization: Bearer YOUR_TOKEN"

# Processar fila
curl -X POST http://localhost:3001/api/whatsapp/test/process \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Queries Úteis para Debug

### Ver todas as mensagens de um usuário

```sql
SELECT 
  message_key,
  status,
  scheduled_for,
  sent_at,
  created_at
FROM whatsapp_message_queue
WHERE user_id = 'USER_UUID_AQUI'
ORDER BY created_at;
```

### Ver estatísticas de um usuário

```sql
SELECT 
  p.id as user_id,
  p.phone,
  p.created_at,
  (SELECT COUNT(*) FROM accounts WHERE user_id = p.id) as account_count,
  (SELECT COUNT(*) FROM transactions WHERE user_id = p.id) as transaction_count,
  (SELECT COUNT(*) FROM whatsapp_message_queue WHERE user_id = p.id) as messages_count
FROM profiles p
WHERE p.id = 'USER_UUID_AQUI';
```

### Ver mensagens pendentes próximas de serem enviadas

```sql
SELECT 
  message_key,
  phone,
  scheduled_for,
  AGE(NOW(), scheduled_for) as overdue_by
FROM whatsapp_message_queue
WHERE status = 'pending'
AND scheduled_for <= NOW() + INTERVAL '1 hour'
ORDER BY scheduled_for;
```

### Ver taxa de sucesso geral

```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM whatsapp_message_queue
GROUP BY status;
```

### Ver tempo médio entre agendamento e envio

```sql
SELECT 
  message_key,
  COUNT(*) as sent_count,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at)) / 60) as avg_minutes_to_send
FROM whatsapp_message_queue
WHERE status = 'sent'
GROUP BY message_key
ORDER BY avg_minutes_to_send;
```

---

## Troubleshooting

### Mensagens não estão sendo agendadas

**Checklist:**
- [ ] Usuário tem telefone cadastrado?
- [ ] Migration foi aplicada?
- [ ] Job de agendamento está rodando? (verificar logs)
- [ ] Condições do template estão satisfeitas?

**Query de diagnóstico:**
```sql
-- Ver usuários com telefone que não têm nenhuma mensagem
SELECT p.id, p.phone, p.created_at
FROM profiles p
WHERE p.phone IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM whatsapp_message_queue 
  WHERE user_id = p.id
);
```

### Mensagens agendadas mas não enviadas

**Checklist:**
- [ ] Job de processamento está rodando?
- [ ] `scheduled_for` já passou?
- [ ] Webhook está acessível?

**Query de diagnóstico:**
```sql
-- Ver mensagens que deveriam ter sido enviadas
SELECT 
  id,
  message_key,
  phone,
  scheduled_for,
  AGE(NOW(), scheduled_for) as overdue
FROM whatsapp_message_queue
WHERE status = 'pending'
AND scheduled_for <= NOW()
ORDER BY scheduled_for
LIMIT 20;
```

### Mensagens com status 'failed'

**Checklist:**
- [ ] Webhook retornou erro?
- [ ] Telefone está no formato correto?
- [ ] Rede/firewall está bloqueando?

**Query de diagnóstico:**
```sql
SELECT * FROM whatsapp_message_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

### Deletar mensagens de teste

```sql
-- CUIDADO: Deletar TODAS as mensagens (use com cautela)
DELETE FROM whatsapp_message_queue;

-- Deletar apenas de um usuário
DELETE FROM whatsapp_message_queue 
WHERE user_id = 'USER_UUID_AQUI';

-- Deletar apenas mensagens pendentes antigas
DELETE FROM whatsapp_message_queue
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '7 days';
```

---

## Monitoramento em Produção

### Métricas Importantes

1. **Mensagens enviadas por dia**
```sql
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as messages_sent
FROM whatsapp_message_queue
WHERE status = 'sent'
GROUP BY DATE(sent_at)
ORDER BY date DESC;
```

2. **Tempo na fila**
```sql
SELECT 
  message_key,
  AVG(EXTRACT(EPOCH FROM (sent_at - scheduled_for)) / 60) as avg_delay_minutes
FROM whatsapp_message_queue
WHERE status = 'sent'
GROUP BY message_key;
```

3. **Taxa de falha por tipo de mensagem**
```sql
SELECT 
  message_key,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / 
    COUNT(*), 2
  ) as failure_rate
FROM whatsapp_message_queue
GROUP BY message_key;
```

---

## 🎯 Checklist de Go-Live

- [ ] Migration aplicada em produção
- [ ] Backend deployed com novos arquivos
- [ ] Jobs iniciando corretamente (verificar logs)
- [ ] Teste com 1 usuário real
- [ ] Webhook respondendo (verificar logs do Railway)
- [ ] Monitoramento configurado
- [ ] Plano de rollback pronto

---

**Dúvidas?** Consulte a documentação completa em `WHATSAPP-ACTIVATION-IMPLEMENTATION.md`
