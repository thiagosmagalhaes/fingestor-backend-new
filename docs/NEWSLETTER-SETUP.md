# Sistema de Newsletter - Guia de Instalação

## 📦 Instalação

Não é necessário instalar nenhuma dependência adicional! O sistema usa apenas `fetch` nativo do Node.js 18+.

## ⚙️ Configuração

### 1. Obter API Key do Resend

1. Acesse: https://resend.com/signup
2. Crie uma conta gratuita
3. Vá em: https://resend.com/api-keys
4. Clique em "Create API Key"
5. Copie a chave gerada (começa com `re_`)

### 2. Configurar Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Fingestor <newsletter@fingestor.com.br>

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# Testing (opcional)
TEST_EMAIL=seu-email@teste.com
```

### 3. Verificar Domínio (Opcional - Para Produção)

Para enviar de um domínio customizado (ex: `newsletter@fingestor.com.br`):

1. Acesse: https://resend.com/domains
2. Clique em "Add Domain"
3. Digite seu domínio (ex: `fingestor.com.br`)
4. Configure os registros DNS conforme instruções:
   - **SPF**: TXT record
   - **DKIM**: TXT record
   - **DMARC**: TXT record
5. Aguarde verificação (pode levar até 48h)

> **Nota**: No plano gratuito, você pode usar `onboarding@resend.dev` sem configurar domínio próprio.

## 🧪 Testar a Integração

### Teste Rápido

Execute o script de teste:

```bash
npm run test:newsletter
```

Isso irá enviar 5 emails de teste para o email configurado em `TEST_EMAIL`:

1. ✅ Newsletter de Boas-Vindas
2. ⏰ Newsletter de Trial Expirando
3. 💳 Newsletter de Assinatura Confirmada
4. 📰 Newsletter de Atualizações
5. 🎨 Newsletter Customizada Completa

### Verificar no Dashboard

1. Acesse: https://resend.com/emails
2. Veja todos os emails enviados
3. Verifique status de entrega

### Modo Dev (Sem API Key)

Se `RESEND_API_KEY` não estiver configurada, os emails não serão enviados mas o sistema funcionará normalmente:

```
📧 [MODO DEV] Newsletter não enviada (sem API key)
```

## 🚀 Integrar com Signup

Para enviar newsletter de boas-vindas automaticamente no cadastro:

```typescript
// src/controllers/auth.controller.ts
import { EmailService } from '../services/email.service';

const emailService = new EmailService();

async signup(req: Request, res: Response) {
  // ... criar usuário ...
  
  // Enviar newsletter de boas-vindas
  const unsubscribeToken = generateUnsubscribeToken(user.email);
  await emailService.sendWelcomeNewsletter(
    user.email,
    user.name,
    unsubscribeToken
  );
  
  // ... retornar resposta ...
}
```

## 🔄 Integrar com Webhook do Stripe

Para notificar assinatura confirmada:

```typescript
// src/controllers/subscriptions.controller.ts
import { EmailService } from '../services/email.service';

const emailService = new EmailService();

async handleStripeWebhook(req: Request, res: Response) {
  // ... processar webhook ...
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Buscar dados do usuário
    const user = await getUserByEmail(session.customer_email);
    
    // Enviar confirmação
    const token = generateUnsubscribeToken(user.email);
    await emailService.sendSubscriptionConfirmedNewsletter(
      user.email,
      user.name,
      planName,
      token
    );
  }
  
  // ... continuar processamento ...
}
```

## ⏰ Criar Job para Trial Expirando

Para enviar alertas automaticamente:

```typescript
// src/jobs/trial-expiring.job.ts
import cron from 'node-cron';
import { EmailService } from '../services/email.service';
import { supabase } from '../config/database';

const emailService = new EmailService();

export function startTrialExpiringJob() {
  // Executa todo dia às 9h
  cron.schedule('0 9 * * *', async () => {
    console.log('🔍 Verificando trials expirando...');
    
    try {
      // Buscar usuários com trial expirando em 3 dias
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const { data: users } = await supabase
        .from('users')
        .select('id, email, name, trial_end_date')
        .eq('subscription_status', 'trial_period')
        .lte('trial_end_date', threeDaysFromNow.toISOString())
        .gte('trial_end_date', new Date().toISOString());
      
      if (!users || users.length === 0) {
        console.log('✓ Nenhum trial expirando');
        return;
      }
      
      // Enviar newsletter para cada usuário
      for (const user of users) {
        const daysRemaining = Math.ceil(
          (new Date(user.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        const token = generateUnsubscribeToken(user.email);
        await emailService.sendTrialExpiringNewsletter(
          user.email,
          user.name,
          daysRemaining,
          token
        );
        
        console.log(`📧 Newsletter enviada para ${user.email}`);
      }
      
      console.log(`✅ ${users.length} newsletters enviadas`);
    } catch (error) {
      console.error('❌ Erro ao processar trials expirando:', error);
    }
  });
  
  console.log('✓ Job de trial expirando iniciado');
}
```

Adicione no `src/index.ts`:

```typescript
import { startTrialExpiringJob } from './jobs/trial-expiring.job';

// ... após iniciar servidor ...
startTrialExpiringJob();
```

## 📊 Monitoramento

### Ver Estatísticas

1. Acesse: https://resend.com/emails
2. Veja métricas:
   - **Delivered**: Emails entregues com sucesso
   - **Opened**: Taxa de abertura
   - **Clicked**: Taxa de cliques nos links
   - **Bounced**: Emails rejeitados
   - **Complained**: Marcados como spam

### Logs no Backend

O EmailService registra automaticamente:

```
✅ Email enviado com sucesso: abc123xyz
❌ Erro ao enviar email via Resend: {...}
📧 [MODO DEV] Newsletter não enviada (sem API key)
```

## 🔒 Segurança

### Rate Limiting

O Resend tem rate limits:
- **Plano Free**: 100 emails/dia
- **Plano Pro**: Ilimitado (com soft limit)

### Validação de Email

O Resend valida automaticamente:
- Formato de email
- Domínio existente
- MX records

### Proteção contra Spam

Sempre inclua:
- ✅ Link de descadastro funcional
- ✅ Endereço físico da empresa (opcional)
- ✅ Informação clara do remetente

## ❓ Troubleshooting

### Erro: "Invalid API key"

```
❌ Erro ao enviar email via Resend: { statusCode: 401, message: "Invalid API key" }
```

**Solução**: Verifique se `RESEND_API_KEY` está configurada corretamente no `.env`

### Erro: "Unverified domain"

```
❌ Erro: { statusCode: 403, message: "Unverified domain" }
```

**Solução**: Use `onboarding@resend.dev` ou verifique seu domínio no dashboard

### Erro: "Rate limit exceeded"

```
❌ Erro: { statusCode: 429, message: "Rate limit exceeded" }
```

**Solução**: Aguarde ou faça upgrade para plano pago

### Template não carrega

```
❌ Erro ao carregar template de newsletter
```

**Solução**: Verifique se o arquivo `templates/newsletter-layout.html` existe

## 📝 Checklist de Produção

Antes de ir para produção:

- [ ] API Key do Resend configurada
- [ ] Domínio verificado (se não usar `resend.dev`)
- [ ] SPF, DKIM e DMARC configurados
- [ ] Frontend URL configurada corretamente
- [ ] Sistema de descadastro funcionando
- [ ] Jobs de email agendados (se aplicável)
- [ ] Logs de erro configurados
- [ ] Rate limiting implementado (se necessário)
- [ ] Testes realizados com sucesso

## 🔗 Links Úteis

- [Resend Dashboard](https://resend.com/emails)
- [Resend API Docs](https://resend.com/docs)
- [API de Newsletter](./NEWSLETTER-API-DOCUMENTATION.md)
- [Template HTML](./templates/newsletter-layout.html)

---

**Pronto para enviar newsletters! 🚀**
