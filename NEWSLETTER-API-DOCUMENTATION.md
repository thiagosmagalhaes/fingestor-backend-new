# API de Newsletter - Documentação

## 📋 Visão Geral

Sistema de envio de newsletters através do Resend usando template HTML personalizado do Fingestor.

## 🔑 Autenticação

Rotas que enviam newsletters customizadas ou em massa requerem autenticação JWT.

```
Authorization: Bearer {seu-token-jwt}
```

## 📧 Endpoints

### 1. Enviar Newsletter Customizada

**POST** `/api/newsletter/send`

Envia uma newsletter totalmente personalizada com HTML livre.

**Requer autenticação:** ✅ Sim (apenas administradores)

**Body:**
```json
{
  "to": "usuario@email.com",
  "subject": "Assunto do Email",
  "htmlBody": "<h1>Meu Conteúdo</h1><p>Texto livre com {TAG_INFO}tags personalizadas{/TAG_INFO}</p>"
}
```

**Resposta de sucesso (200):**
```json
{
  "success": true,
  "messageId": "abc123xyz",
  "message": "Newsletter enviada com sucesso"
}
```

---

### 📝 Tags Disponíveis para HTML

Você pode usar estas tags dentro do campo `htmlBody` para adicionar componentes estilizados:

#### 1. Caixa de Informação (Azul)
```html
{TAG_INFO}
  Sua mensagem de informação aqui
{/TAG_INFO}
```
**Renderiza:** Box azul com ícone de informação

#### 2. Caixa de Sucesso (Verde)
```html
{TAG_SUCCESS}
  Operação concluída com sucesso!
{/TAG_SUCCESS}
```
**Renderiza:** Box verde com ícone de check

#### 3. Caixa de Aviso (Amarelo)
```html
{TAG_WARNING}
  Atenção: prazo próximo do vencimento
{/TAG_WARNING}
```
**Renderiza:** Box amarelo com ícone de alerta

#### 4. Botão Call-to-Action
```html
{TAG_BUTTON|https://fingestor.com.br/dashboard}
  Acessar Dashboard
{/TAG_BUTTON}
```
**Renderiza:** Botão roxo destacado com link

#### 5. Lista de Features
```html
{TAG_FEATURES_START|Novidades desta semana}

{TAG_FEATURE_ITEM|Dashboard Renovado}
Nova interface mais clara e intuitiva
{/TAG_FEATURE_ITEM}

{TAG_FEATURE_ITEM|Exportação Excel}
Exporte seus relatórios em formato XLSX
{/TAG_FEATURE_ITEM}

{/TAG_FEATURES_END}
```
**Renderiza:** Seção com título e lista de cards

#### 6. Separador Horizontal
```html
{TAG_DIVIDER}
```
**Renderiza:** Linha horizontal cinza para separar seções

#### 7. Espaçamento
```html
{TAG_SPACE|20}
```
**Renderiza:** Espaço vertical em pixels (útil para ajustar layout)

---

### 📋 Exemplo Completo de Newsletter

```json
{
  "to": "usuario@email.com",
  "subject": "Bem-vindo ao Fingestor!",
  "htmlBody": "<h1>Olá, João! 👋</h1><p>É um prazer ter você conosco. O Fingestor é sua plataforma completa de gestão financeira.</p>{TAG_SPACE|10}<h2>Comece agora:</h2>{TAG_FEATURES_START|Principais Funcionalidades}{TAG_FEATURE_ITEM|Dashboard em Tempo Real}Visualize todas as suas finanças em um único lugar{/TAG_FEATURE_ITEM}{TAG_FEATURE_ITEM|Controle de Transações}Registre receitas e despesas facilmente{/TAG_FEATURE_ITEM}{TAG_FEATURE_ITEM|Relatórios DRE}Acompanhe o desempenho do seu negócio{/TAG_FEATURE_ITEM}{/TAG_FEATURES_END}{TAG_SPACE|20}{TAG_SUCCESS}Sua conta está ativa e pronta para usar!{/TAG_SUCCESS}{TAG_SPACE|15}{TAG_BUTTON|https://fingestor.com.br/dashboard}Acessar Meu Dashboard{/TAG_BUTTON}<p style='margin-top:30px;color:#6b7280;'>Qualquer dúvida, estamos à disposição!</p>"
}
```

### 📋 Exemplo Formatado (para facilitar leitura)

```html
<h1>Olá, João! 👋</h1>

<p>É um prazer ter você conosco. O Fingestor é sua plataforma completa de gestão financeira.</p>

{TAG_SPACE|10}

<h2>Comece agora:</h2>

{TAG_FEATURES_START|Principais Funcionalidades}

{TAG_FEATURE_ITEM|Dashboard em Tempo Real}
Visualize todas as suas finanças em um único lugar
{/TAG_FEATURE_ITEM}

{TAG_FEATURE_ITEM|Controle de Transações}
Registre receitas e despesas facilmente
{/TAG_FEATURE_ITEM}

{TAG_FEATURE_ITEM|Relatórios DRE}
Acompanhe o desempenho do seu negócio
{/TAG_FEATURE_ITEM}

{/TAG_FEATURES_END}

{TAG_SPACE|20}

{TAG_SUCCESS}
Sua conta está ativa e pronta para usar!
{/TAG_SUCCESS}

{TAG_SPACE|15}

{TAG_BUTTON|https://fingestor.com.br/dashboard}
Acessar Meu Dashboard
{/TAG_BUTTON}

<p style='margin-top:30px;color:#6b7280;'>
  Qualquer dúvida, estamos à disposição!
</p>
```

---

### 2. Enviar Newsletter de Boas-Vindas

**POST** `/api/newsletter/welcome`

Envia newsletter de boas-vindas para novos usuários.

**Requer autenticação:** ❌ Não (para uso em signup)

**Body:**
```json
{
  "email": "usuario@email.com",
  "name": "João Silva"
}
```

**Resposta de sucesso (200):**
```json
{
  "success": true,
  "messageId": "abc123xyz",
  "message": "Newsletter de boas-vindas enviada"
}
```

**Template automático inclui:**
- Saudação personalizada
- Lista de funcionalidades principais
- Botão para acessar dashboard
- Link de descadastro

---

### 3. Enviar Newsletter de Trial Expirando

**POST** `/api/newsletter/trial-expiring`

Notifica usuário que o período de teste está terminando.

**Requer autenticação:** ❌ Não

**Body:**
```json
{
  "email": "usuario@email.com",
  "name": "João Silva",
  "daysRemaining": 3
}
```

**Resposta de sucesso (200):**
```json
{
  "success": true,
  "messageId": "abc123xyz",
  "message": "Newsletter de trial expirando enviada"
}
```

**Template automático inclui:**
- Aviso de expiração
- Número de dias restantes
- Box de aviso destacado
- Botão para ver planos

---

### 4. Enviar Newsletter de Assinatura Confirmada

**POST** `/api/newsletter/subscription-confirmed`

Confirma ativação da assinatura do usuário.

**Requer autenticação:** ❌ Não

**Body:**
```json
{
  "email": "usuario@email.com",
  "name": "João Silva",
  "planName": "Mensal"
}
```

**Resposta de sucesso (200):**
```json
{
  "success": true,
  "messageId": "abc123xyz",
  "message": "Newsletter de assinatura confirmada enviada"
}
```

**Template automático inclui:**
- Confirmação de pagamento
- Nome do plano contratado
- Box de sucesso destacado
- Botão para acessar dashboard

---

### 5. Enviar Newsletter de Atualizações

**POST** `/api/newsletter/updates`

Envia novidades e atualizações do sistema para múltiplos usuários.

**Requer autenticação:** ✅ Sim

**Body:**
```json
{
  "emails": [
    "usuario1@email.com",
    "usuario2@email.com"
  ],
  "updates": [
    {
      "title": "Dashboard renovado",
      "description": "Nova interface mais clara e intuitiva"
    },
    {
      "title": "Exportação para Excel",
      "description": "Exporte seus relatórios em formato XLSX"
    },
    {
      "title": "Notificações WhatsApp",
      "description": "Receba alertas importantes no celular"
    }
  ]
}
```

**Resposta de sucesso (200):**
```json
{
  "success": true,
  "messageId": "abc123xyz",
  "message": "Newsletter de atualizações enviada",
  "recipientsCount": 2
}
```

---

## 🎨 Componentes do Template

### Boxes Informativos

Você pode incluir boxes destacados nas newsletters:

#### Info Box (Azul)
```json
{
  "infoBox": "Configure sua conta em 5 minutos"
}
```

#### Success Box (Verde)
```json
{
  "successBox": "Sua conta foi ativada com sucesso!"
}
```

#### Warning Box (Amarelo)
```json
{
  "warningBox": "Seu trial expira em 3 dias"
}
```

### Lista de Features

```json
{
  "featuresTitle": "Novidades desta semana:",
  "features": [
    {
      "title": "Título do recurso",
      "description": "Descrição do recurso"
    }
  ]
}
```

### Call-to-Action (Botão)

```json
{
  "ctaUrl": "https://fingestor.com.br/dashboard",
  "ctaText": "Acessar Dashboard"
}
```

---

## 🔧 Configuração

### Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# Resend API
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Fingestor <newsletter@fingestor.com.br>

# Frontend URL (para links)
FRONTEND_URL=https://fingestor.com.br
```

### Obter API Key do Resend

1. Acesse: https://resend.com/api-keys
2. Clique em "Create API Key"
3. Copie a chave e adicione no `.env`

### Verificar Domínio

Para enviar de um domínio customizado:

1. Acesse: https://resend.com/domains
2. Adicione seu domínio
3. Configure os registros DNS (SPF, DKIM, DMARC)

---

## 💻 Exemplos de Uso

### Exemplo 1: Enviar Newsletter no Signup

```typescript
// No controller de autenticação
import { EmailService } from '../services/email.service';

const emailService = new EmailService();

// Após criar usuário
const unsubscribeToken = generateToken(user.email);
await emailService.sendWelcomeNewsletter(
  user.email,
  user.name,
  unsubscribeToken
);
```

### Exemplo 2: Verificar Trial Expirando (Cron Job)

```typescript
// Job diário para verificar trials expirando
import { EmailService } from '../services/email.service';

const emailService = new EmailService();

// Buscar usuários com trial expirando em 3 dias
const usersExpiringTrial = await getTrialExpiringUsers(3);

for (const user of usersExpiringTrial) {
  const token = generateToken(user.email);
  await emailService.sendTrialExpiringNewsletter(
    user.email,
    user.name,
    3,
    token
  );
}
```

### Exemplo 3: Confirmar Assinatura (Webhook Stripe)

```typescript
// No webhook do Stripe
import { EmailService } from '../services/email.service';

const emailService = new EmailService();

// Quando assinatura é confirmada
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  
  const token = generateToken(session.customer_email);
  await emailService.sendSubscriptionConfirmedNewsletter(
    session.customer_email,
    userName,
    planName,
    token
  );
}
```

### Exemplo 4: Enviar Atualizações Mensais

```typescript
// Script para enviar newsletter mensal
const axios = require('axios');

const updates = [
  {
    title: 'Dashboard renovado',
    description: 'Nova interface mais clara e intuitiva'
  },
  {
    title: 'Exportação Excel',
    description: 'Exporte relatórios em XLSX'
  }
];

// Buscar todos os emails ativos
const activeUsers = await getActiveUserEmails();

await axios.post('http://localhost:3001/api/newsletter/updates', {
  emails: activeUsers,
  updates
}, {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
```

---

## ⚠️ Tratamento de Erros

### Erro 400 - Bad Request
```json
{
  "error": "Campos obrigatórios: email, name"
}
```

### Erro 401 - Unauthorized
```json
{
  "error": "Não autorizado"
}
```

### Erro 500 - Erro ao Enviar
```json
{
  "error": "Erro ao enviar newsletter",
  "details": {
    "statusCode": 422,
    "message": "Invalid email address",
    "name": "validation_error"
  }
}
```

---

## 📊 Monitoramento

### Verificar Envios no Dashboard Resend

1. Acesse: https://resend.com/emails
2. Veja todas as newsletters enviadas
3. Monitore:
   - Taxa de entrega
   - Taxa de abertura
   - Taxa de cliques
   - Bounces e complaints

### Logs no Backend

O serviço de email registra logs:

```
✅ Email enviado com sucesso: abc123xyz
❌ Erro ao enviar email via Resend: { statusCode: 422, ... }
📧 [MODO DEV] Newsletter não enviada (sem API key)
```

---

## 🧪 Testando

### Teste Local (sem API key)

Quando `RESEND_API_KEY` não está configurada, os emails não são enviados mas retornam sucesso:

```json
{
  "success": true,
  "messageId": "dev-mode-skip"
}
```

### Teste com API Key

```bash
curl -X POST http://localhost:3001/api/newsletter/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@teste.com",
    "name": "Teste"
  }'
```

---

## 📈 Limites do Resend

| Plano | Emails/dia | Emails/mês | Preço |
|-------|-----------|-----------|-------|
| Free | 100 | 3.000 | Grátis |
| Pro | Ilimitado | 50.000 | $20/mês |
| Scale | Ilimitado | 100.000+ | Custom |

---

## 🔗 Links Úteis

- [Resend Documentation](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/emails)
- [Template HTML](../templates/newsletter-layout.html)
- [Guia de Integração](../templates/RESEND-INTEGRATION.md)
