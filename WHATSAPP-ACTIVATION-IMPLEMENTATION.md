# 📲 WhatsApp Activation System - Implementação Backend

## Visão Geral

Sistema de ativação de usuários via WhatsApp implementado no backend do Fingestor. O sistema envia mensagens automatizadas para novos usuários baseado no estágio de onboarding em que se encontram.

---

## 🏗️ Arquitetura

### Arquivos Criados

1. **Migration**: `supabase/migrations/20260127000000_create_whatsapp_message_queue.sql`
2. **Types**: `src/types/whatsapp.types.ts`
3. **Controller**: `src/controllers/whatsapp.controller.ts`
4. **Jobs**: `src/jobs/whatsapp.job.ts`
5. **Integração**: `src/index.ts` (atualizado)

---

## 📊 Estrutura do Banco de Dados

### Tabela: `whatsapp_message_queue`

```sql
CREATE TABLE whatsapp_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message_key TEXT NOT NULL,
  message_body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_user_message UNIQUE (user_id, message_key)
);
```

**Índices criados:**
- `idx_whatsapp_queue_status` - Performance em queries por status
- `idx_whatsapp_queue_scheduled` - Performance para buscar mensagens pendentes
- `idx_whatsapp_queue_user_id` - Performance em queries por usuário

**Segurança:**
- RLS habilitado
- Apenas service role pode acessar

---

## 🔄 Fluxo de Funcionamento

### 1. Job de Agendamento (a cada 1 hora)

```typescript
startWhatsAppSchedulingJob()
```

**O que faz:**
1. Busca todos os usuários com telefone cadastrado
2. Para cada usuário:
   - Calcula estatísticas (contas criadas, transações, mensagens já enviadas)
   - Avalia cada template de mensagem
   - Verifica condições e prazos
   - Agenda mensagens elegíveis na fila

**Condições avaliadas:**
- Usuário tem telefone?
- Mensagem já foi agendada/enviada?
- Condição do template é satisfeita?
- Tempo correto desde o cadastro?

### 2. Job de Processamento (a cada 5 minutos)

```typescript
startWhatsAppProcessingJob()
```

**O que faz:**
1. Busca mensagens com status `pending` e `scheduled_for <= now()`
2. Para cada mensagem:
   - Envia via webhook
   - Atualiza status para `sent` ou `failed`
   - Registra `sent_at` em caso de sucesso

---

## 📝 Templates de Mensagens

### Plano Completo

| Message Key        | Delay       | Condição                         |
|--------------------|-------------|----------------------------------|
| `welcome_10min`    | 10 minutos  | Sempre                           |
| `create_account_24h` | 24 horas  | Nenhuma conta criada             |
| `first_tx_48h`     | 48 horas    | Conta criada, mas sem transações |
| `micro_win_72h`    | 72 horas    | Conta criada, mas sem transações |
| `value_5d`         | 5 dias      | Nenhuma transação                |
| `help_7d`          | 7 dias      | Nenhuma transação                |

### Conteúdo das Mensagens

Todos os textos estão armazenados em `MESSAGE_TEMPLATES` no controller:

```typescript
export const MESSAGE_TEMPLATES: MessageTemplate[]
```

---

## 🔌 Integração com Webhook

### Endpoint do Webhook

```
POST https://primary-production-0244.up.railway.app/webhook/fda1bd64-1411-4912-b410-105b419b618d
```

### Payload

```json
{
  "phone": "+5511999999999",
  "message": "Conteúdo da mensagem..."
}
```

### Tratamento de Resposta

- **Sucesso (2xx)**: `status = 'sent'`, `sent_at = now()`
- **Erro**: `status = 'failed'`, `sent_at = null`

---

## 🛡️ Regras de Segurança

### Prevenção de Duplicatas

1. **Constraint Única**: `UNIQUE (user_id, message_key)`
2. **Verificação no código**: Lista de `sentMessages` consultada antes de agendar
3. **Ignora erros 23505**: Violação de constraint única é silenciosa

### Validações

- ❌ Nunca enviar para telefone nulo
- ❌ Nunca reenviar mesma mensagem
- ❌ Nunca enviar fora do prazo correto
- ✅ Sempre respeitar condições dos templates
- ✅ Sempre registrar tentativas de envio

---

## 🧪 Como Testar

### 1. Aplicar Migration

```bash
# No Supabase Studio ou via CLI
supabase migration up
```

### 2. Iniciar o Backend

```bash
npm run dev
```

### 3. Logs Esperados

```
[WhatsApp Scheduling] Starting job...
✅ WhatsApp message scheduling job scheduled (every hour)
[WhatsApp Processing] Starting job...
✅ WhatsApp message processing job scheduled (every 5 minutes)
```

### 4. Criar Usuário de Teste

1. Cadastrar novo usuário no sistema
2. Adicionar telefone no perfil
3. Aguardar execução dos jobs

### 5. Verificar Fila

```sql
SELECT * FROM whatsapp_message_queue 
ORDER BY created_at DESC;
```

---

## 📈 Monitoramento

### Queries Úteis

**Mensagens pendentes:**
```sql
SELECT message_key, COUNT(*) 
FROM whatsapp_message_queue 
WHERE status = 'pending' 
GROUP BY message_key;
```

**Taxa de sucesso:**
```sql
SELECT 
  status, 
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM whatsapp_message_queue
GROUP BY status;
```

**Mensagens por usuário:**
```sql
SELECT 
  user_id, 
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'pending') as pending
FROM whatsapp_message_queue
GROUP BY user_id;
```

---

## 🔧 Configuração

### Variáveis de Ambiente

Não são necessárias novas variáveis. O sistema usa:
- Conexão Supabase existente
- Webhook URL hardcoded (conforme especificação)

### Ajuste de Frequência dos Jobs

Em `src/jobs/whatsapp.job.ts`:

```typescript
// Processamento (padrão: 5 minutos)
setInterval(async () => { ... }, 300000);

// Agendamento (padrão: 1 hora)
setInterval(async () => { ... }, 3600000);
```

---

## 🚨 Tratamento de Erros

### Erros Silenciosos

- Violação de constraint única (mensagem já existe)
- Usuário sem telefone (pulado)

### Erros Logados

- Falha ao buscar perfil do usuário
- Falha ao contar accounts/transactions
- Falha ao agendar mensagem (exceto duplicata)
- Falha ao enviar via webhook
- Falha ao atualizar status

### Retry

- ❌ **Não implementado**: Mensagens com `status = 'failed'` permanecem assim
- 💡 **Implementação futura**: Job de retry para mensagens falhadas

---

## 🎯 Métricas de Sucesso

### KPIs Esperados

1. **Taxa de agendamento**: % de novos usuários que recebem `welcome_10min`
2. **Taxa de envio**: % de mensagens `pending` → `sent`
3. **Taxa de ativação**: % de usuários que criam conta/transação após mensagens

### Auditoria

Toda a fila é auditável:
- Quem recebeu qual mensagem
- Quando foi agendada
- Quando foi enviada
- Status final

---

## 🔮 Próximos Passos

### Melhorias Futuras

1. **Retry automático** para mensagens falhadas
2. **Dashboard** de monitoramento
3. **A/B testing** de conteúdo de mensagens
4. **Rate limiting** mais sofisticado
5. **Resposta do webhook** (callbacks)
6. **Personalização** de mensagens (nome do usuário)
7. **Timezone** awareness (horários adequados)

---

## 📚 Referências

- Documentação original: Fornecida pelo cliente
- Webhook: Railway production endpoint
- Templates: Texto fornecido como "fonte de verdade"

---

## ✅ Checklist de Implementação

- [x] Migration criada
- [x] Tipos TypeScript definidos
- [x] Controller implementado
- [x] Jobs configurados
- [x] Integração no index.ts
- [x] Documentação completa
- [ ] Testes em produção
- [ ] Monitoramento ativo
- [ ] Ajustes baseados em feedback

---

**Implementado em:** 27 de janeiro de 2026  
**Status:** ✅ Pronto para deploy
