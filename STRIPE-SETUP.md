# Configuração de Variáveis de Ambiente para Stripe

## Adicione ao seu arquivo `.env`

```env
# Stripe Configuration
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Frontend URL (para redirects do Stripe Checkout)
FRONTEND_URL=http://localhost:3000
```

## Passos para Configurar o Webhook

### 1. Desenvolvimento Local (usando Stripe CLI)

```bash
# Instalar Stripe CLI (se ainda não tem)
# Windows (usando Scoop)
scoop install stripe

# Ou baixar de: https://github.com/stripe/stripe-cli/releases

# Login no Stripe
stripe login

# Iniciar servidor local
npm run dev

# Em outro terminal, fazer forward dos webhooks
stripe listen --forward-to localhost:3001/api/subscriptions/webhook

# Você verá algo como:
# > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx

# Copie o secret e adicione ao .env como STRIPE_WEBHOOK_SECRET
```

### 2. Produção (Dashboard do Stripe)

1. **Acesse o Dashboard:**
   - Vá para: https://dashboard.stripe.com/webhooks

2. **Adicione um Endpoint:**
   - Clique em "Add endpoint"
   - URL: `https://seu-dominio.com/api/subscriptions/webhook`
   - Versão: "Latest API version"

3. **Selecione os Eventos:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

4. **Obtenha o Signing Secret:**
   - Após criar o endpoint, clique nele
   - Copie o "Signing secret" (começa com `whsec_`)
   - Adicione ao seu `.env` em produção

5. **Teste o Webhook:**
   - No dashboard do Stripe, vá até o endpoint criado
   - Clique em "Send test webhook"
   - Selecione `checkout.session.completed`
   - Verifique nos logs se recebeu o evento

## Importante: Segurança

⚠️ **NUNCA commite o arquivo `.env` no Git!**

Certifique-se que `.env` está no `.gitignore`:

```gitignore
# .gitignore
.env
.env.local
.env.production
```

## Testar se está funcionando

### 1. Criar um pagamento de teste:

```bash
# Usar Stripe CLI para disparar evento
stripe trigger checkout.session.completed
```

### 2. Verificar logs do servidor:

Você deve ver no console:
```
Evento recebido: checkout.session.completed
Assinatura criada com sucesso
```

### 3. Verificar no banco de dados:

```sql
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1;
```

## Troubleshooting

### Erro: "Webhook signature verification failed"
- Certifique-se que `STRIPE_WEBHOOK_SECRET` está correto no `.env`
- Verifique se o secret é do ambiente correto (test vs live)
- Reinicie o servidor após alterar o `.env`

### Erro: "No signatures found matching the expected signature"
- O corpo da requisição pode estar sendo parseado antes de chegar ao webhook
- Certifique-se que a rota `/api/subscriptions/webhook` está usando `express.raw()`
- Veja a configuração no `src/index.ts`

### Webhook não está sendo chamado
- Verifique se a URL está acessível publicamente (use ngrok para testes locais)
- Confirme que os eventos estão selecionados no dashboard do Stripe
- Verifique os logs do endpoint no dashboard do Stripe

## Usando ngrok para Testes Locais

Se você não quiser usar o Stripe CLI, pode usar ngrok:

```bash
# Instalar ngrok
# Windows: https://ngrok.com/download

# Iniciar servidor local
npm run dev

# Em outro terminal, criar tunnel
ngrok http 3001

# Você verá algo como:
# Forwarding: https://xxxx-xx-xxx-xxx-xx.ngrok.io -> http://localhost:3001

# Use a URL do ngrok no dashboard do Stripe:
# https://xxxx-xx-xxx-xxx-xx.ngrok.io/api/subscriptions/webhook
```

## Monitoramento de Webhooks

### Ver logs no Dashboard do Stripe:
1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique no seu endpoint
3. Veja a aba "Logs" para ver todos os eventos enviados e as respostas

### Reenviar webhooks falhados:
Se um webhook falhar, você pode reenviá-lo:
1. No dashboard, vá até o evento falhado
2. Clique em "Resend"
3. O evento será enviado novamente

## Checklist de Configuração

- [ ] Stripe CLI instalado (para dev local)
- [ ] `STRIPE_SECRET_KEY` adicionada ao `.env`
- [ ] `STRIPE_PUBLISHABLE_KEY` adicionada ao `.env`
- [ ] Webhook configurado no dashboard do Stripe (para produção)
- [ ] `STRIPE_WEBHOOK_SECRET` adicionada ao `.env`
- [ ] `FRONTEND_URL` configurada corretamente
- [ ] `.env` está no `.gitignore`
- [ ] Migration aplicada no Supabase
- [ ] Servidor rodando e recebendo webhooks
- [ ] Teste de checkout realizado com sucesso
