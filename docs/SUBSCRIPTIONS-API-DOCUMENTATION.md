# API de Assinaturas - Stripe Integration

## Visão Geral
Sistema completo de gerenciamento de assinaturas integrado com Stripe para planos mensal, semestral e anual.

## Planos Disponíveis
- **Mensal**: `price_1SrlrJDKY42gdNF0z0tLxG3f`
- **Semestral**: `price_1SrlsDDKY42gdNF0AiNUdIPv`
- **Anual**: `price_1SrlrqDKY42gdNF0xtnl7giI`

## Configuração

### Variáveis de Ambiente
Adicione ao seu `.env`:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

### Aplicar Migration
Execute a migration do Supabase:
```bash
supabase db push
```

### Configurar Webhook no Stripe
1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/webhooks)
2. Adicione um novo endpoint: `https://seu-dominio.com/api/subscriptions/webhook`
3. Selecione os eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copie o `Signing secret` e adicione como `STRIPE_WEBHOOK_SECRET` no `.env`

## Endpoints

### 1. Criar Sessão de Checkout
Cria uma sessão de checkout do Stripe para iniciar uma assinatura.

**Endpoint:** `POST /api/subscriptions/checkout`  
**Autenticação:** Requerida (Bearer token)

**Request Body:**
```json
{
  "plan_type": "mensal"
}
```

**Valores aceitos para `plan_type`:** `mensal`, `semestral`, `anual`

**Response (200):**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "trial": true,
  "trialDays": 30
}
```

**Campos da resposta:**
- `sessionId` - ID da sessão de checkout do Stripe
- `url` - URL para redirecionar o usuário ao checkout
- `trial` - `true` se é primeira assinatura (ganha 30 dias grátis), `false` caso contrário
- `trialDays` - Número de dias de trial (30 na primeira assinatura, 0 nas subsequentes)

**Exemplo de uso:**
```javascript
const response = await fetch('http://localhost:3001/api/subscriptions/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({ plan_type: 'mensal' })
});

const { url, trial, trialDays } = await response.json();

// Informar o usuário sobre o trial
if (trial) {
  alert(`Você ganhará ${trialDays} dias grátis!`);
}

window.location.href = url; // Redirecionar para checkout
```

### 2. Webhook do Stripe
Recebe eventos do Stripe (configurado no dashboard do Stripe).

**Endpoint:** `POST /api/subscriptions/webhook`  
**Autenticação:** Validação por assinatura do Stripe

**Eventos tratados:**
- `checkout.session.completed` - Cria assinatura no banco após pagamento
- `customer.subscription.updated` - Atualiza status da assinatura
- `customer.subscription.deleted` - Marca assinatura como cancelada
- `invoice.payment_failed` - Marca assinatura como `past_due`

### 3. Obter Status da Assinatura
Retorna o status da assinatura do usuário autenticado.

**Endpoint:** `GET /api/subscriptions/status`  
**Autenticação:** Requerida (Bearer token)

**Response (200):**
```json
{
  "id": "uuid",
  "plan_type": "mensal",
  "status": "active",
  "current_period_start": "2026-01-20T00:00:00Z",
  "current_period_end": "2026-02-20T00:00:00Z",
  "cancel_at_period_end": false
}
```

**Possíveis status:**
- `active` - Assinatura ativa
- `trialing` - Em período de teste
- `past_due` - Pagamento atrasado
- `canceled` - Cancelada
- `unpaid` - Não paga
- `incomplete` - Pagamento incompleto
- `incomplete_expired` - Pagamento incompleto expirado

### 4. Cancelar Assinatura
Cancela a assinatura no fim do período atual.

**Endpoint:** `POST /api/subscriptions/cancel`  
**Autenticação:** Requerida (Bearer token)

**Response (200):**
```json
{
  "message": "Assinatura será cancelada no fim do período atual",
  "subscription": {
    "id": "uuid",
    "plan_type": "mensal",
    "status": "active",
    "cancel_at_period_end": true,
    "current_period_end": "2026-02-20T00:00:00Z"
  }
}
```

### 5. Reativar Assinatura
Reativa uma assinatura que foi marcada para cancelamento.

**Endpoint:** `POST /api/subscriptions/reactivate`  
**Autenticação:** Requerida (Bearer token)

**Response (200):**
```json
{
  "message": "Assinatura reativada com sucesso",
  "subscription": {
    "id": "uuid",
    "plan_type": "mensal",
    "status": "active",
    "cancel_at_period_end": false
  }
}
```

## Fluxo de Assinatura

### 1. Usuário Inicia Assinatura
```
Frontend → POST /api/subscriptions/checkout
         ← { url: "https://checkout.stripe.com/..." }
Redireciona usuário → Stripe Checkout
```

### 2. Usuário Completa Pagamento
```
Stripe → POST /api/subscriptions/webhook
      → checkout.session.completed
      → Cria registro na tabela subscriptions
```

### 3. Usuário Verifica Status
```
Frontend → GET /api/subscriptions/status
         ← { status: "active", plan_type: "mensal", ... }
```

### 4. Usuário Cancela
```
Frontend → POST /api/subscriptions/cancel
         ← { message: "Cancelada no fim do período" }
Stripe → POST /api/subscriptions/webhook
      → customer.subscription.updated
      → Atualiza cancel_at_period_end = true
```

## Estrutura do Banco de Dados

### Tabela: `subscriptions`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único da assinatura |
| `user_id` | UUID | Referência ao usuário (auth.users) |
| `stripe_customer_id` | TEXT | ID do customer no Stripe |
| `stripe_subscription_id` | TEXT | ID da subscription no Stripe |
| `plan_type` | TEXT | Tipo do plano (mensal/semestral/anual) |
| `price_id` | TEXT | ID do preço no Stripe |
| `status` | TEXT | Status da assinatura |
| `current_period_start` | TIMESTAMPTZ | Início do período atual |
| `current_period_end` | TIMESTAMPTZ | Fim do período atual |
| `cancel_at_period_end` | BOOLEAN | Se será cancelada no fim |
| `canceled_at` | TIMESTAMPTZ | Data de cancelamento |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

### RPC Function: `get_user_subscription()`
Retorna a assinatura mais recente do usuário autenticado.

## Segurança

### Row Level Security (RLS)
- Usuários podem apenas visualizar suas próprias assinaturas
- Backend (service role) tem acesso total para operações via webhook

### Validação de Webhook
- Todos os webhooks são validados com a assinatura do Stripe
- Usa `STRIPE_WEBHOOK_SECRET` para verificar autenticidade

## Testes

### Testar Checkout Localmente
```bash
# Usar Stripe CLI para testar webhooks localmente
stripe listen --forward-to localhost:3001/api/subscriptions/webhook

# Em outro terminal, disparar evento de teste
stripe trigger checkout.session.completed
```

### Testar com Postman

**1. Criar Checkout Session:**
```http
POST http://localhost:3001/api/subscriptions/checkout
Authorization: Bearer <seu_token>
Content-Type: application/json

{
  "plan_type": "mensal"
}
```

**2. Obter Status:**
```http
GET http://localhost:3001/api/subscriptions/status
Authorization: Bearer <seu_token>
```

**3. Cancelar:**
```http
POST http://localhost:3001/api/subscriptions/cancel
Authorization: Bearer <seu_token>
```

## Erros Comuns

### 400 - Bad Request
- Tipo de plano inválido
- Usuário já possui assinatura ativa
- Webhook sem assinatura válida

### 401 - Unauthorized
- Token de autenticação ausente ou inválido

### 404 - Not Found
- Usuário não encontrado
- Nenhuma assinatura encontrada

### 500 - Internal Server Error
- Erro ao comunicar com Stripe
- Erro ao salvar no banco de dados

## Próximos Passos

### ✅ Implementado

1. **Período de Trial de 30 dias:**
   - ✅ Primeira assinatura ganha 30 dias grátis
   - ✅ Assinaturas subsequentes não ganham trial
   - ✅ Backend detecta automaticamente
   - ✅ Resposta do checkout inclui informação de trial

### 🔜 Funcionalidades Futuras

1. Adicionar notificações por email quando:
   - Assinatura é criada
   - Pagamento falha
   - Assinatura é cancelada

2. Implementar controle de acesso baseado em assinatura:
   - Middleware para verificar se usuário tem assinatura ativa
   - Limitar features baseado no plano

3. Dashboard de métricas:
   - Total de assinantes por plano
   - MRR (Monthly Recurring Revenue)
   - Taxa de cancelamento (churn)

4. Upgrade/Downgrade de planos:
   - Permitir mudança entre planos
   - Cálculo proporcional (proration)

