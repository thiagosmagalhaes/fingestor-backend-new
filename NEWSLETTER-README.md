# 📧 Sistema de Newsletter - Quick Start

Sistema completo de envio de newsletters integrado com Resend usando template HTML personalizado do Fingestor.

## 🚀 Setup Rápido (3 passos)

### 1. Configure as variáveis de ambiente

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Fingestor <newsletter@fingestor.com.br>
FRONTEND_URL=http://localhost:5173
TEST_EMAIL=seu-email@teste.com
```

### 2. Teste o sistema

```bash
npm run test:newsletter
```

### 3. Use nos seus controllers

```typescript
import { EmailService } from './services/email.service';

const emailService = new EmailService();

// Boas-vindas
await emailService.sendWelcomeNewsletter(email, name, token);

// Trial expirando
await emailService.sendTrialExpiringNewsletter(email, name, days, token);

// Assinatura confirmada
await emailService.sendSubscriptionConfirmedNewsletter(email, name, plan, token);
```

## 📡 API Endpoints

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/api/newsletter/send` | POST | ✅ | Newsletter customizada |
| `/api/newsletter/welcome` | POST | ❌ | Boas-vindas |
| `/api/newsletter/trial-expiring` | POST | ❌ | Trial expirando |
| `/api/newsletter/subscription-confirmed` | POST | ❌ | Assinatura confirmada |
| `/api/newsletter/updates` | POST | ✅ | Atualizações do sistema |

## 💡 Exemplo: Newsletter Customizada

```bash
curl -X POST http://localhost:3001/api/newsletter/send \
  -H "Authorization: Bearer SEU-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "usuario@email.com",
    "subject": "Novidades do Fingestor",
    "title": "Veja as novidades!",
    "subtitle": "Melhorias importantes para você",
    "content": "Este mês trouxemos várias melhorias...",
    "features": [
      {
        "title": "Dashboard renovado",
        "description": "Nova interface mais clara"
      }
    ],
    "ctaUrl": "https://fingestor.com.br/dashboard",
    "ctaText": "Ver Novidades"
  }'
```

## 🎨 Componentes do Template

### Boxes Informativos

```json
{
  "infoBox": "💡 Dica importante",
  "successBox": "✅ Operação concluída",
  "warningBox": "⚠️ Atenção necessária"
}
```

### Lista de Features

```json
{
  "featuresTitle": "Novidades:",
  "features": [
    { "title": "Feature 1", "description": "Descrição 1" },
    { "title": "Feature 2", "description": "Descrição 2" }
  ]
}
```

### Botão de Ação

```json
{
  "ctaUrl": "https://fingestor.com.br/action",
  "ctaText": "Clique Aqui"
}
```

## 📚 Documentação Completa

- **[NEWSLETTER-SETUP.md](./NEWSLETTER-SETUP.md)** - Guia completo de instalação e configuração
- **[NEWSLETTER-API-DOCUMENTATION.md](./NEWSLETTER-API-DOCUMENTATION.md)** - Documentação detalhada da API
- **[templates/RESEND-INTEGRATION.md](./templates/RESEND-INTEGRATION.md)** - Integração com Resend
- **[templates/README-NEWSLETTER.md](./templates/README-NEWSLETTER.md)** - Guia do template HTML

## 🔑 Obter API Key

1. Crie conta: https://resend.com/signup
2. Obtenha chave: https://resend.com/api-keys
3. Configure no `.env`

## 🎯 Casos de Uso

### 1. Signup (Boas-Vindas)

```typescript
// No controller de autenticação
await emailService.sendWelcomeNewsletter(
  user.email,
  user.name,
  unsubscribeToken
);
```

### 2. Webhook Stripe (Confirmação)

```typescript
// No webhook
if (event.type === 'checkout.session.completed') {
  await emailService.sendSubscriptionConfirmedNewsletter(
    email, name, planName, token
  );
}
```

### 3. Cron Job (Trial Expirando)

```typescript
// Job diário
const usersExpiring = await getTrialExpiringUsers(3);
for (const user of usersExpiring) {
  await emailService.sendTrialExpiringNewsletter(
    user.email, user.name, 3, token
  );
}
```

### 4. Newsletter Mensal

```typescript
const activeUsers = await getActiveUserEmails();
await emailService.sendUpdatesNewsletter(
  activeUsers,
  [
    { title: 'Feature 1', description: 'Nova funcionalidade' },
    { title: 'Feature 2', description: 'Melhoria importante' }
  ],
  token
);
```

## ⚡ Recursos

- ✅ Template HTML responsivo
- ✅ Identidade visual do Fingestor
- ✅ Componentes reutilizáveis (boxes, features, CTA)
- ✅ Compilação Handlebars (loops e condicionais)
- ✅ Modo dev (funciona sem API key)
- ✅ Logs detalhados
- ✅ TypeScript completo
- ✅ Zero dependências extras

## 📊 Limites

| Plano | Emails/dia | Emails/mês | Preço |
|-------|-----------|-----------|-------|
| Free | 100 | 3.000 | Grátis |
| Pro | ∞ | 50.000 | $20/mês |

## 🐛 Debug

### Ver logs
```typescript
// Console mostrará:
✅ Email enviado com sucesso: abc123
❌ Erro ao enviar: {...}
📧 [MODO DEV] Email não enviado
```

### Ver no dashboard
https://resend.com/emails

---

**Questões?** Consulte a [documentação completa](./NEWSLETTER-SETUP.md) ou abra uma issue.
