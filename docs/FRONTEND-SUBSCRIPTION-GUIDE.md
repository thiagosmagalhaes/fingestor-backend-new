# Guia de Integração - Sistema de Assinaturas (Frontend)

## Visão Geral

Este documento descreve como integrar o sistema de assinaturas Stripe no frontend. 

**IMPORTANTE:** Todos os usuários ganham **15 dias grátis** ao se cadastrar. Durante esse período podem usar o sistema livremente sem precisar assinar. Quando faltarem 3 dias ou menos, o sistema começa a avisar que é necessário assinar.

Todas as requisições que exigem autenticação devem incluir o token JWT no header `Authorization: Bearer <token>`.

---

## 📌 Resumo Rápido

### Como Funciona

1. **Usuário se cadastra** → Ganha 15 dias grátis automaticamente
2. **Dias 1-12** → Usa normalmente, sem avisos
3. **Dias 13-15** → Sistema mostra banner: "Faltam X dias, assine agora!"
4. **Dia 16+** → Acesso bloqueado, precisa assinar
5. **Após assinar** → Acesso liberado indefinidamente

### Verificações Principais

```javascript
// Ao fazer login
const status = await getSubscriptionStatus();

// ✅ Permitir acesso?
const canAccess = !status.requires_subscription;

// ⚠️ Mostrar banner de aviso?
const showBanner = status.warning_subscription && status.trial_days_remaining > 0;

// ❌ Bloquear e redirecionar?
const mustBlock = status.requires_subscription;
```

### Estados Possíveis

| Status | Significado | Ação |
|--------|-------------|------|
| `trial_period` + `warning: false` | Teste, sem aviso | ✅ Liberar acesso |
| `trial_period` + `warning: true` | Teste, ≤3 dias | ⚠️ Liberar + Mostrar banner |
| `trial_expired` | Trial acabou | ❌ Bloquear, redirecionar |
| `active` | Assinatura paga | ✅ Liberar acesso completo |

---

## 1. Verificar se Usuário Tem Assinatura Ativa

### Endpoint
```
GET /api/subscriptions/status
```

### Headers Necessários
```
Authorization: Bearer <jwt_token>
```

### Exemplo cURL
```bash
curl -X GET http://localhost:3001/api/subscriptions/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Respostas Possíveis

#### ✅ Usuário no período de trial (primeiros 15 dias)
**Status: 200 OK**
```json
{
  "id": null,
  "plan_type": null,
  "status": "trial_period",
  "current_period_start": "2026-01-20T10:30:00.000Z",
  "current_period_end": "2026-02-04T10:30:00.000Z",
  "cancel_at_period_end": false,
  "trial_days_remaining": 10,
  "requires_subscription": false,
  "warning_subscription": false
}
```

**Como interpretar:**
- `status: "trial_period"` → Usuário está usando os 15 dias grátis
- `trial_days_remaining` → Dias restantes do trial (10 neste exemplo)
- `requires_subscription: false` → Ainda não precisa assinar
- `warning_subscription: false` → Ainda tem mais de 3 dias
- Usuário pode usar normalmente o sistema

#### ⚠️ Usuário no trial com menos de 3 dias restantes
**Status: 200 OK**
```json
{
  "id": null,
  "plan_type": null,
  "status": "trial_period",
  "current_period_start": "2026-01-20T10:30:00.000Z",
  "current_period_end": "2026-02-04T10:30:00.000Z",
  "cancel_at_period_end": false,
  "trial_days_remaining": 2,
  "requires_subscription": false,
  "warning_subscription": true
}
```

**Como interpretar:**
- `warning_subscription: true` → **MOSTRAR BANNER DE AVISO**
- `trial_days_remaining: 2` → Faltam 2 dias
- Mensagem sugerida: "Faltam 2 dias para seu período de teste expirar. Assine agora para continuar usando!"
- Botão: "Escolher Plano"

#### ❌ Trial expirado sem assinatura
**Status: 200 OK**
```json
{
  "id": null,
  "plan_type": null,
  "status": "trial_expired",
  "current_period_start": "2026-01-05T10:30:00.000Z",
  "current_period_end": "2026-01-20T10:30:00.000Z",
  "cancel_at_period_end": false,
  "trial_days_remaining": 0,
  "requires_subscription": true,
  "warning_subscription": true
}
```

**Como interpretar:**
- `status: "trial_expired"` → Trial de 15 dias acabou
- `requires_subscription: true` → **BLOQUEAR ACESSO**
- Redirecionar para página de planos
- Mensagem: "Seu período de teste expirou. Escolha um plano para continuar."

#### ✅ Usuário com assinatura ativa
**Status: 200 OK**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "plan_type": "mensal",
  "status": "active",
  "current_period_start": "2026-01-20T00:00:00.000Z",
  "current_period_end": "2026-02-20T00:00:00.000Z",
  "cancel_at_period_end": false,
  "trial_days_remaining": 0,
  "requires_subscription": false,
  "warning_subscription": false
}
```

**Como interpretar:**
- `status: "active"` → Assinatura paga está ativa
- `plan_type: "mensal"` → Plano atual do usuário
- `current_period_end` → Data em que o período atual termina
- `cancel_at_period_end: false` → Assinatura vai renovar automaticamente
- Usuário tem acesso completo
#### ✅ Assinatura marcada para cancelamento
**Status: 200 OK**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "plan_type": "semestral",
  "status": "active",
  "current_period_start": "2026-01-20T00:00:00.000Z",
  "current_period_end": "2026-07-20T00:00:00.000Z",
  "cancel_at_period_end": true,
  "trial_days_remaining": 0,
  "requires_subscription": false,
  "warning_subscription": false
}
```

**Como interpretar:**
- `cancel_at_period_end: true` → Usuário cancelou, mas ainda pode usar até `current_period_end`
- Mostrar aviso: "Sua assinatura será cancelada em [data]"
- Oferecer opção para reativar

#### ❌ Token inválido
**Status: 401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Usuário não autenticado"
}
```

**Como interpretar:**
- Token JWT ausente ou inválido
- Redirecionar para login

### Estados de Assinatura

| Status | Significado | Usuário pode usar? | Mostrar banner? |
|--------|-------------|-------------------|-----------------|
| `trial_period` | Período grátis de 15 dias | ✅ Sim | ⚠️ Se `warning_subscription: true` |
| `trial_expired` | Trial expirado, sem assinatura | ❌ Não | ✅ Sim - Redirecionar |
| `active` | Assinatura ativa e paga | ✅ Sim | ❌ Não |
| `trialing` | (Não usado mais) | ✅ Sim | ❌ Não |
| `past_due` | Pagamento falhou | ⚠️ Depende da regra | ✅ Sim |
| `canceled` | Cancelada | ❌ Não | ✅ Sim |
| `unpaid` | Não paga | ❌ Não | ✅ Sim |
| `incomplete` | Pagamento incompleto | ❌ Não | ✅ Sim |

**Lógica recomendada para o frontend:**
```javascript
const response = await getSubscriptionStatus();

// Verificar se pode usar o sistema
const canUseSystem = 
  response.status === "active" || 
  response.status === "trial_period";

// Verificar se deve mostrar banner de aviso
const shouldShowBanner = response.warning_subscription === true;

// Verificar se DEVE bloquear acesso
const mustBlock = response.requires_subscription === true;

if (mustBlock) {
  redirectTo("/pricing"); // Trial expirado, forçar escolha de plano
} else if (shouldShowBanner && response.trial_days_remaining > 0) {
  showBanner(`Faltam ${response.trial_days_remaining} dias. Assine agora!`);
} else if (canUseSystem) {
  // Permitir acesso normal
}
```

---

## 2. Criar Nova Assinatura

### Endpoint
```
POST /api/subscriptions/checkout
```

### Headers Necessários
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Body
```json
{
  "plan_type": "mensal"
}
```

**Planos disponíveis:**
- `"mensal"` → Plano mensal
- `"semestral"` → Plano semestral (6 meses)
- `"anual"` → Plano anual (12 meses)

### Exemplo cURL
```bash
curl -X POST http://localhost:3001/api/subscriptions/checkout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"plan_type":"mensal"}'
```

### Respostas Possíveis

#### ✅ Sessão de checkout criada
**Status: 200 OK**
```json
{
  "sessionId": "cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3..."
}
```

**Como interpretar:**
- `url` → Redirecionar o usuário para esta URL do Stripe
- Cobrança será imediata (usuário já usou os 15 dias grátis ao se cadastrar)
- **NÃO há período de trial no Stripe** (trial são os 15 dias iniciais)

**O que fazer no frontend:**
```javascript
1. Receber a resposta
2. Fazer: window.location.href = response.url
3. Usuário será redirecionado para checkout do Stripe
4. Após pagamento, Stripe redireciona para: /subscription/success?session_id=...
```

#### ❌ Usuário já tem assinatura ativa
**Status: 400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Usuário já possui uma assinatura ativa"
}
```

**Como interpretar:**
- Usuário tentou criar nova assinatura mas já tem uma ativa
- Redirecionar para página de gerenciamento de assinatura

#### ❌ Tipo de plano inválido
**Status: 400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Tipo de plano inválido. Use: mensal, semestral ou anual"
}
```

**Como interpretar:**
- Valor enviado no `plan_type` não é válido
- Verificar se está enviando exatamente: "mensal", "semestral" ou "anual"

---

## 3. Cancelar Assinatura

### Endpoint
```
POST /api/subscriptions/cancel
```

### Headers Necessários
```
Authorization: Bearer <jwt_token>
```

### Exemplo cURL
```bash
curl -X POST http://localhost:3001/api/subscriptions/cancel \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Respostas Possíveis

#### ✅ Assinatura cancelada com sucesso
**Status: 200 OK**
```json
{
  "message": "Assinatura será cancelada no fim do período atual",
  "subscription": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "user_id": "user-uuid-here",
    "plan_type": "mensal",
    "status": "active",
    "current_period_end": "2026-02-20T00:00:00.000Z",
    "cancel_at_period_end": true
  }
}
```

**Como interpretar:**
- Assinatura foi marcada para cancelamento
- Usuário ainda pode usar até `current_period_end`
- `cancel_at_period_end: true` → Não renovará automaticamente
- Mostrar mensagem: "Sua assinatura permanecerá ativa até [data]"

#### ❌ Nenhuma assinatura ativa encontrada
**Status: 404 Not Found**
```json
{
  "error": "Not Found",
  "message": "Nenhuma assinatura ativa encontrada"
}
```

**Como interpretar:**
- Usuário não tem assinatura ativa para cancelar
- Pode já estar cancelada ou nunca teve

---

## 4. Reativar Assinatura Cancelada

### Endpoint
```
POST /api/subscriptions/reactivate
```

### Headers Necessários
```
Authorization: Bearer <jwt_token>
```

### Exemplo cURL
```bash
curl -X POST http://localhost:3001/api/subscriptions/reactivate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Respostas Possíveis

#### ✅ Assinatura reativada com sucesso
**Status: 200 OK**
```json
{
  "message": "Assinatura reativada com sucesso",
  "subscription": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "user_id": "user-uuid-here",
    "plan_type": "anual",
    "status": "active",
    "current_period_end": "2027-01-20T00:00:00.000Z",
    "cancel_at_period_end": false
  }
}
```

**Como interpretar:**
- Assinatura voltou a renovar automaticamente
- `cancel_at_period_end: false` → Renovará no fim do período
- **IMPORTANTE:** Não ganha 30 dias de trial novamente

#### ❌ Nenhuma assinatura cancelada encontrada
**Status: 404 Not Found**
```json
{
  "error": "Not Found",
  "message": "Nenhuma assinatura cancelada encontrada"
}
```

**Como interpretar:**
- Usuário não tem assinatura marcada para cancelamento
- Só é possível reativar se `cancel_at_period_end: true`

---

## 5. Fluxo Completo de Uso

### Cenário 1: Novo Usuário (Primeiros 15 Dias)

```
1. Usuário se cadastra na aplicação
   └─> Ganha automaticamente 15 dias grátis

2. Usuário faz login pela primeira vez
   └─> GET /api/subscriptions/status
       └─> Resposta: 200 {
             "status": "trial_period",
             "trial_days_remaining": 15,
             "requires_subscription": false,
             "warning_subscription": false
           }

3. Frontend permite acesso completo
   └─> Não mostra banner de aviso
   └─> Usuário usa o sistema normalmente

4. Após 12 dias, usuário faz login
   └─> GET /api/subscriptions/status
       └─> Resposta: {
             "trial_days_remaining": 3,
             "warning_subscription": true  ← MUDOU!
           }

5. Frontend mostra banner de aviso
   └─> "Faltam 3 dias no seu período de teste. Assine agora!"
   └─> [Botão: Escolher Plano]

6. Usuário clica em "Escolher Plano"
   └─> POST /api/subscriptions/checkout
       └─> Body: {"plan_type": "mensal"}
       └─> Resposta: {
             "url": "https://checkout.stripe.com/..."
           }

7. Frontend redireciona para Stripe
   └─> window.location.href = response.url

8. Usuário preenche cartão e confirma
   └─> Cobrança é IMEDIATA (já usou os 15 dias grátis)
   └─> Stripe redireciona para /subscription/success

9. GET /api/subscriptions/status
   └─> Resposta: {
         "status": "active",
         "plan_type": "mensal",
         "requires_subscription": false
       }

10. Usuário agora tem acesso completo com assinatura paga
```

### Cenário 2: Trial Expirado Sem Assinatura

```
1. Passaram-se 16 dias desde o cadastro
   └─> GET /api/subscriptions/status
       └─> Resposta: {
             "status": "trial_expired",
             "trial_days_remaining": 0,
             "requires_subscription": true  ← BLOQUEAR!
           }

2. Frontend bloqueia acesso
   └─> Mostra tela: "Seu período de teste expirou"
   └─> [Botão: Escolher Plano para Continuar]

3. Usuário escolhe um plano
   └─> POST /api/subscriptions/checkout
   └─> Redireciona para Stripe

4. Após pagamento, acesso é liberado
```

### Cenário 3: Usuário com Assinatura Ativa

```
1. Usuário já tem assinatura paga
   └─> GET /api/subscriptions/status
       └─> Resposta: {
             "status": "active",
             "plan_type": "mensal",
             "cancel_at_period_end": false
           }

2. Frontend permite acesso completo
   └─> Não mostra avisos

3. Usuário acessa "Gerenciar Assinatura"
   └─> Mostra plano atual, data de renovação
   └─> Opção: "Cancelar Assinatura"

4. Usuário clica em "Cancelar"
   └─> POST /api/subscriptions/cancel
       └─> Resposta: {
             "cancel_at_period_end": true,
             "current_period_end": "2026-02-20T..."
           }

5. Frontend mostra aviso
   └─> "Sua assinatura permanecerá ativa até 20/02/2026"
   └─> [Botão: Reativar Assinatura]
```

---

## 6. Regras de Negócio

### ✅ Período de Trial Gratuito (15 dias)

**Como funciona:**
- ✅ TODO usuário ganha 15 dias grátis ao se cadastrar
- ✅ Não precisa cadastrar cartão para usar esses 15 dias
- ✅ Acesso completo ao sistema durante esse período
- ✅ Quando faltarem 3 dias ou menos, sistema avisa
- ✅ Após 15 dias sem assinar, acesso é bloqueado

**Status retornado:**
- Dias 1-12: `trial_period` com `warning_subscription: false`
- Dias 13-15: `trial_period` com `warning_subscription: true` ← **MOSTRAR BANNER**
- Dia 16+: `trial_expired` com `requires_subscription: true` ← **BLOQUEAR ACESSO**

**Exemplo de banner:**
```
┌─────────────────────────────────────────────────┐
│ ⚠️ Faltam 2 dias no seu período de teste       │
│ Assine agora para continuar usando!            │
│ [Escolher Plano]                                │
└─────────────────────────────────────────────────┘
```

### ✅ Assinatura no Stripe

**Quando assinatura é criada:**
- Usuário escolhe um plano
- É redirecionado para Stripe
- Cadastra cartão de crédito
- **Cobrança é IMEDIATA** (já usou os 15 dias grátis)
- **NÃO há trial period no Stripe**

**Após assinar:**
- Status muda para `"active"`
- `requires_subscription: false`
- `warning_subscription: false`
- Acesso liberado indefinidamente (enquanto pagar)

### ✅ Cancelamento

**Como funciona:**
- Usuário pode cancelar a qualquer momento
- Acesso permanece até o fim do período pago
- `cancel_at_period_end: true`
- Não há reembolso proporcional

**Exemplo:**
```
Usuário pagou plano mensal em 20/01/2026
Cancela em 05/02/2026
Continua usando até 20/02/2026
Não há renovação automática
```

### ✅ Reativação

**Como funciona:**
- Só pode reativar se `cancel_at_period_end: true`
- Assinatura volta a renovar automaticamente
- Mantém o mesmo plano e data de renovação
- **NÃO ganha trial novamente** (nem os 15 dias, nem trial do Stripe)

### ✅ Estados que Permitem Acesso

Para liberar acesso ao sistema, verificar:
```javascript
const canAccess = 
  response.status === "active" || 
  response.status === "trial_period";
  
// OU verificar o campo direto:
const canAccess = !response.requires_subscription;
```

Qualquer outro status → verificar `requires_subscription: true` → bloquear

### ✅ Quando Mostrar Banner de Aviso

```javascript
if (response.warning_subscription === true) {
  if (response.status === "trial_period") {
    showBanner(`Faltam ${response.trial_days_remaining} dias no seu teste. Assine agora!`);
  } else if (response.status === "trial_expired") {
    redirectTo("/pricing"); // Bloquear acesso
  }
}
```

---

## 7. Tratamento de Erros

### Erros Comuns

| Status | Erro | Como tratar |
|--------|------|------------|
| 401 | Token inválido | Redirecionar para login |
| 404 | Sem assinatura | Redirecionar para planos |
| 400 | Já tem assinatura | Mostrar mensagem, ir para dashboard |
| 400 | Plano inválido | Erro de código, verificar valor enviado |
| 500 | Erro interno | Mostrar "Erro ao processar, tente novamente" |

### Timeout e Retry

**Ao criar checkout:**
- Se timeout → tentar novamente
- Se erro 500 → tentar novamente (máximo 2 vezes)

**Ao verificar status:**
- Se 404 → é esperado (sem assinatura)
- Se erro 500 → tentar novamente após 2 segundos

---

## 8. Pontos de Atenção

### ⚠️ Sempre Verificar Status ao Fazer Login

```javascript
// Ao fazer login ou carregar app
const status = await getSubscriptionStatus();

if (status.requires_subscription) {
  // Trial expirou e não tem assinatura
  redirectTo("/pricing");
} else if (status.warning_subscription && status.trial_days_remaining > 0) {
  // Faltam 3 dias ou menos no trial
  showBanner(`Faltam ${status.trial_days_remaining} dias. Assine!`);
}
```

### ⚠️ Campos Importantes da Resposta

| Campo | Tipo | Quando usar |
|-------|------|-------------|
| `status` | string | Identificar estado (trial_period, active, trial_expired...) |
| `trial_days_remaining` | number | Mostrar quantos dias restam no banner |
| `requires_subscription` | boolean | **CRÍTICO:** Se true, BLOQUEAR acesso |
| `warning_subscription` | boolean | Se true, MOSTRAR banner de aviso |
| `plan_type` | string \| null | Qual plano o usuário tem (null se em trial) |
| `current_period_end` | string | Quando a assinatura/trial expira |

### ⚠️ Mostrar Informações ao Usuário

**Quando em trial_period:**
```
┌─────────────────────────────────────┐
│ Período de Teste                    │
│ Faltam 10 dias                      │
│ Aproveite para explorar!            │
│                                     │
│ [Assinar Agora]                     │
└─────────────────────────────────────┘
```

**Quando em trial com aviso (≤3 dias):**
```
┌─────────────────────────────────────┐
│ ⚠️ Seu período de teste está        │
│ acabando! Faltam 2 dias.            │
│                                     │
│ [Escolher Plano Agora]              │
└─────────────────────────────────────┘
```

**Quando tem assinatura ativa:**
```
┌─────────────────────────────────────┐
│ Plano Atual: Mensal                 │
│ Status: Ativo                       │
│ Próxima cobrança: 20/02/2026        │
│                                     │
│ [Gerenciar Assinatura]              │
└─────────────────────────────────────┘
```

---

## 9. URLs de Redirect do Stripe

Configurar no código do frontend:

**Sucesso:**
```
/subscription/success?session_id={CHECKOUT_SESSION_ID}
```

**Cancelamento:**
```
/subscription/cancel
```

O que fazer em cada página:

**Página de Sucesso:**
1. Mostrar mensagem de sucesso
2. Aguardar 2 segundos
3. Buscar status da assinatura
4. Redirecionar para dashboard

**Página de Cancelamento:**
1. Mostrar mensagem: "Assinatura não foi completada"
2. Botão: "Tentar novamente" → volta para planos
3. Botão: "Voltar ao dashboard"

---

## 10. Checklist de Implementação

- [ ] Implementar verificação de status ao fazer login
- [ ] Criar lógica de banner de aviso quando `warning_subscription: true`
- [ ] Criar lógica de bloqueio quando `requires_subscription: true`
- [ ] Criar página de planos
- [ ] Implementar redirecionamento para Stripe checkout
- [ ] Criar página de sucesso após checkout
- [ ] Criar página de gerenciamento de assinatura
- [ ] Implementar botão de cancelamento
- [ ] Implementar botão de reativação
- [ ] Adicionar proteção de rotas baseado em `requires_subscription`
- [ ] Mostrar contador de dias restantes no trial
- [ ] Tratar todos os estados possíveis (trial_period, trial_expired, active, etc)
- [ ] Testar fluxo completo:
  - [ ] Cadastro → 15 dias grátis
  - [ ] Dia 13 → aparece banner
  - [ ] Dia 16 → bloqueia acesso
  - [ ] Assinar → libera acesso
  - [ ] Cancelar → mantém acesso até fim do período
  - [ ] Reativar → volta a renovar
- [ ] Usar cartões de teste do Stripe

---

## 11. Cartões de Teste do Stripe

Para testes em ambiente de desenvolvimento:

**Cartão que funciona:**
```
Número: 4242 4242 4242 4242
Data: Qualquer data futura (ex: 12/27)
CVC: Qualquer 3 dígitos (ex: 123)
CEP: Qualquer (ex: 12345)
```

**Cartão que falha:**
```
Número: 4000 0000 0000 0002
```

**Cartão que requer autenticação:**
```
Número: 4000 0027 6000 3184
```

---

## Dúvidas ou Problemas?

Consulte a documentação técnica completa em:
- `SUBSCRIPTIONS-API-DOCUMENTATION.md`
- `STRIPE-SETUP.md`
