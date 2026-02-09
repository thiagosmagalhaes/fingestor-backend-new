# Changelog - Sistema de Assinaturas

## 🎉 Nova Implementação - 15 Dias Grátis

### O Que Mudou

#### ❌ Regra ANTIGA (removida)
- Usuário precisava ir ao Stripe para começar a usar
- Primeira assinatura ganhava 30 dias de trial no Stripe
- Precisava cadastrar cartão antes de usar

#### ✅ Regra NOVA (implementada)
- **TODO usuário ganha 15 dias grátis ao se cadastrar**
- Não precisa cadastrar cartão para usar esses 15 dias
- Quando faltarem 3 dias ou menos, sistema avisa
- Após 15 dias sem assinar, acesso é bloqueado
- Ao assinar no Stripe, cobrança é imediata (sem trial adicional)

---

## Implementação Técnica

### 1. Migration Atualizada
**Arquivo:** `supabase/migrations/20260120000000_create_subscriptions.sql`

**Nova função RPC:** `get_user_subscription()`
- Retorna 7 campos adicionais
- Calcula dias restantes do trial automaticamente
- Retorna avisos quando necessário

**Campos retornados:**
```sql
- id (UUID ou NULL)
- plan_type (TEXT ou NULL)
- status (TEXT) -- pode ser: trial_period, trial_expired, active, etc
- current_period_start (TIMESTAMPTZ)
- current_period_end (TIMESTAMPTZ)
- cancel_at_period_end (BOOLEAN)
- trial_days_remaining (INTEGER) -- NOVO
- requires_subscription (BOOLEAN) -- NOVO
- warning_subscription (BOOLEAN) -- NOVO
```

### 2. Controller Simplificado
**Arquivo:** `src/controllers/subscriptions.controller.ts`

**Mudanças:**
- ❌ Removida lógica de trial de 30 dias no Stripe
- ❌ Removida verificação de "primeira assinatura"
- ✅ Checkout sempre sem trial (cobrança imediata)
- ✅ `/status` sempre retorna algo (nunca 404)

**Antes:**
```typescript
return res.status(200).json({
  sessionId: session.id,
  url: session.url,
  trial: isFirstSubscription,
  trialDays: isFirstSubscription ? 30 : 0,
});
```

**Depois:**
```typescript
return res.status(200).json({
  sessionId: session.id,
  url: session.url,
});
```

### 3. Endpoint `/status` Atualizado

**Antes:** Retornava 404 se não tinha assinatura

**Agora:** Sempre retorna 200 com um dos estados:
- `trial_period` - Está nos 15 dias grátis
- `trial_expired` - Trial acabou, precisa assinar
- `active` - Tem assinatura paga ativa
- `canceled` - Assinatura cancelada
- `past_due` - Pagamento atrasado

---

## Frontend - Como Usar

### Verificar Status
```bash
curl -X GET http://localhost:3001/api/subscriptions/status \
  -H "Authorization: Bearer <token>"
```

### Possíveis Respostas

#### 1. Trial Ativo (primeiros 12 dias)
```json
{
  "status": "trial_period",
  "trial_days_remaining": 10,
  "requires_subscription": false,
  "warning_subscription": false
}
```
**Ação:** Liberar acesso completo

#### 2. Trial com Aviso (últimos 3 dias)
```json
{
  "status": "trial_period",
  "trial_days_remaining": 2,
  "requires_subscription": false,
  "warning_subscription": true
}
```
**Ação:** Liberar acesso + Mostrar banner "Faltam 2 dias!"

#### 3. Trial Expirado
```json
{
  "status": "trial_expired",
  "trial_days_remaining": 0,
  "requires_subscription": true,
  "warning_subscription": true
}
```
**Ação:** Bloquear acesso, redirecionar para /pricing

#### 4. Assinatura Ativa
```json
{
  "id": "uuid-aqui",
  "plan_type": "mensal",
  "status": "active",
  "requires_subscription": false,
  "warning_subscription": false
}
```
**Ação:** Liberar acesso completo

---

## Fluxo Completo

```
DIA 1 (Cadastro)
├─ Usuário se cadastra
├─ GET /status → trial_period, 15 dias restantes
└─ Acesso liberado ✅

DIA 12
├─ GET /status → trial_period, 3 dias restantes
├─ warning_subscription: true
└─ Mostra banner ⚠️

DIA 13-15
├─ Banner continua sendo mostrado
└─ Usuário pode assinar ou continuar usando

DIA 16
├─ GET /status → trial_expired
├─ requires_subscription: true
└─ Acesso BLOQUEADO ❌ → Redireciona para /pricing

Usuário assina
├─ POST /checkout → Redireciona para Stripe
├─ Preenche cartão → Cobrança IMEDIATA
├─ GET /status → active
└─ Acesso liberado indefinidamente ✅
```

---

## Checklist de Migração

### Backend
- [x] Atualizar migration do Supabase
- [x] Atualizar função RPC `get_user_subscription()`
- [x] Remover lógica de trial do checkout
- [x] Atualizar controller de status
- [x] Testar compilação (npm run build)
- [ ] Aplicar migration no banco: `supabase db push`
- [ ] Reiniciar servidor: `npm run dev`

### Frontend
- [ ] Ler `FRONTEND-SUBSCRIPTION-GUIDE.md`
- [ ] Implementar lógica de `requires_subscription`
- [ ] Implementar lógica de `warning_subscription`
- [ ] Criar banner de aviso
- [ ] Implementar bloqueio de acesso
- [ ] Testar todos os cenários

### Documentação
- [x] Atualizar `FRONTEND-SUBSCRIPTION-GUIDE.md`
- [x] Criar `SUBSCRIPTION-CHANGELOG.md` (este arquivo)
- [ ] Atualizar `SUBSCRIPTIONS-API-DOCUMENTATION.md`

---

## Breaking Changes

### ⚠️ Campos Removidos da Resposta de `/checkout`
**Antes:**
```json
{
  "sessionId": "...",
  "url": "...",
  "trial": true,
  "trialDays": 30
}
```

**Agora:**
```json
{
  "sessionId": "...",
  "url": "..."
}
```

**Ação necessária:** Remover qualquer lógica que dependa de `trial` ou `trialDays` da resposta do checkout.

### ⚠️ Endpoint `/status` Nunca Retorna 404
**Antes:** Retornava 404 quando não tinha assinatura

**Agora:** Sempre retorna 200 com status apropriado

**Ação necessária:** Remover tratamento de erro 404 no `/status`, verificar `requires_subscription` no lugar.

---

## Testes Recomendados

### 1. Teste Manual - Trial de 15 Dias

**Simular passagem do tempo:**
```sql
-- No Supabase, alterar created_at do usuário para simular
UPDATE auth.users 
SET created_at = NOW() - INTERVAL '13 days'
WHERE id = 'seu-user-id';

-- Agora GET /status deve retornar warning_subscription: true
```

### 2. Teste Manual - Trial Expirado
```sql
UPDATE auth.users 
SET created_at = NOW() - INTERVAL '16 days'
WHERE id = 'seu-user-id';

-- Agora GET /status deve retornar trial_expired
```

### 3. Teste Manual - Assinatura Ativa
```bash
# Criar assinatura normalmente
POST /checkout → escolher plano → pagar no Stripe
GET /status → deve retornar status: "active"
```

---

## Suporte

Documentação completa:
- **Frontend:** `FRONTEND-SUBSCRIPTION-GUIDE.md` (leia este primeiro!)
- **Backend:** `SUBSCRIPTIONS-API-DOCUMENTATION.md`
- **Setup Stripe:** `STRIPE-SETUP.md`
- **Exemplos:** `SUBSCRIPTIONS-EXAMPLES.md`

Dúvidas? Verifique os fluxos completos em `FRONTEND-SUBSCRIPTION-GUIDE.md`.
