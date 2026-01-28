# Integração do Template de Newsletter com Resend

## 📋 Visão Geral

O template `newsletter-layout.html` foi configurado para usar variáveis dinâmicas do Resend (sintaxe Handlebars).

## 🔧 Variáveis Disponíveis

### Obrigatórias

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `title` | string | Título principal da newsletter | "Novidades de Janeiro 2025" |
| `subtitle` | string | Subtítulo ou descrição breve | "Confira as melhorias que fizemos" |
| `content` | string | Primeiro parágrafo do conteúdo | "Temos grandes novidades..." |
| `unsubscribeUrl` | string | URL para descadastramento | "https://fingestor.com.br/unsubscribe?token=..." |

### Opcionais

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `additionalContent` | string | Segundo parágrafo (opcional) | "Além disso, melhoramos..." |
| `infoBox` | string | Mensagem de dica/informação | "Configure sua conta em 5 minutos" |
| `successBox` | string | Mensagem de sucesso | "Sua conta foi ativada com sucesso!" |
| `warningBox` | string | Mensagem de aviso | "Seu trial expira em 3 dias" |
| `featuresTitle` | string | Título da seção de features | "Novidades desta semana:" |
| `features` | array | Lista de features (ver estrutura abaixo) | `[{title: "...", description: "..."}]` |
| `ctaUrl` | string | URL do botão principal | "https://fingestor.com.br/dashboard" |
| `ctaText` | string | Texto do botão | "Acessar Dashboard" |
| `closingText` | string | Mensagem de fechamento | "Bom trabalho!" |

### Estrutura do Array `features`

```javascript
features: [
  {
    title: "Título do recurso",
    description: "Descrição breve do que foi adicionado/melhorado"
  },
  {
    title: "Outro recurso",
    description: "Outra descrição"
  }
]
```

## 💻 Exemplos de Uso

### Exemplo 1: Newsletter Simples (TypeScript/JavaScript)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Fingestor <newsletter@fingestor.com.br>',
  to: 'usuario@email.com',
  subject: 'Bem-vindo ao Fingestor!',
  html: newsletterLayoutHtml, // Template HTML carregado
  react: null,
  // Variáveis do template
  templateData: {
    title: 'Bem-vindo ao Fingestor!',
    subtitle: 'Estamos felizes em ter você conosco',
    content: 'Agora você tem acesso completo a todas as ferramentas de controle financeiro para MEI.',
    ctaUrl: 'https://fingestor.com.br/dashboard',
    ctaText: 'Acessar meu Dashboard',
    closingText: 'Bom trabalho e sucesso nos negócios!',
    unsubscribeUrl: 'https://fingestor.com.br/unsubscribe?token=abc123'
  }
});
```

### Exemplo 2: Newsletter com Features

```typescript
await resend.emails.send({
  from: 'Fingestor <newsletter@fingestor.com.br>',
  to: 'usuario@email.com',
  subject: 'Novidades de Janeiro 2025',
  html: newsletterLayoutHtml,
  templateData: {
    title: 'Novidades de Janeiro 2025',
    subtitle: 'Confira as melhorias que fizemos para você',
    content: 'Este mês trouxemos várias melhorias baseadas no feedback dos usuários.',
    
    featuresTitle: 'O que há de novo:',
    features: [
      {
        title: 'Dashboard renovado',
        description: 'Nova interface mais clara e intuitiva'
      },
      {
        title: 'Exportação para Excel',
        description: 'Exporte seus relatórios em formato XLSX'
      },
      {
        title: 'Notificações por WhatsApp',
        description: 'Receba alertas importantes no seu celular'
      }
    ],
    
    ctaUrl: 'https://fingestor.com.br/changelog',
    ctaText: 'Ver todas as novidades',
    
    closingText: 'Obrigado por usar o Fingestor!',
    unsubscribeUrl: 'https://fingestor.com.br/unsubscribe?token=abc123'
  }
});
```

### Exemplo 3: Newsletter com Aviso

```typescript
await resend.emails.send({
  from: 'Fingestor <newsletter@fingestor.com.br>',
  to: 'usuario@email.com',
  subject: 'Seu trial expira em breve',
  html: newsletterLayoutHtml,
  templateData: {
    title: 'Seu período de teste está terminando',
    subtitle: 'Não perca o acesso às suas finanças',
    content: 'Seu período de teste gratuito expira em 3 dias. Continue aproveitando todas as funcionalidades do Fingestor assinando um de nossos planos.',
    
    warningBox: 'Seu trial expira em 28/01/2025. Assine agora para não perder seus dados.',
    
    ctaUrl: 'https://fingestor.com.br/pricing',
    ctaText: 'Ver Planos e Preços',
    
    closingText: 'Qualquer dúvida, estamos à disposição!',
    unsubscribeUrl: 'https://fingestor.com.br/unsubscribe?token=abc123'
  }
});
```

## 🚀 Implementação no Backend

### 1. Criar serviço de email

```typescript
// src/services/email.service.ts
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

export class EmailService {
  private resend: Resend;
  private newsletterTemplate: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    
    // Carregar template HTML
    const templatePath = path.join(__dirname, '../../templates/newsletter-layout.html');
    this.newsletterTemplate = fs.readFileSync(templatePath, 'utf-8');
  }

  async sendNewsletter(to: string, data: NewsletterData) {
    try {
      // Compilar template com dados
      const html = this.compileTemplate(this.newsletterTemplate, data);
      
      await this.resend.emails.send({
        from: 'Fingestor <newsletter@fingestor.com.br>',
        to,
        subject: data.emailSubject,
        html
      });
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar newsletter:', error);
      return { success: false, error };
    }
  }

  private compileTemplate(template: string, data: any): string {
    // Compilar template Handlebars
    const Handlebars = require('handlebars');
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  }
}

interface NewsletterData {
  emailSubject: string;
  title: string;
  subtitle: string;
  content: string;
  additionalContent?: string;
  infoBox?: string;
  successBox?: string;
  warningBox?: string;
  featuresTitle?: string;
  features?: Array<{ title: string; description: string }>;
  ctaUrl?: string;
  ctaText?: string;
  closingText?: string;
  unsubscribeUrl: string;
}
```

### 2. Criar controller

```typescript
// src/controllers/newsletter.controller.ts
import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';

export class NewsletterController {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async sendWelcomeNewsletter(req: Request, res: Response) {
    const { email, name } = req.body;
    
    const unsubscribeToken = generateToken(email);
    
    await this.emailService.sendNewsletter(email, {
      emailSubject: 'Bem-vindo ao Fingestor!',
      title: `Bem-vindo ao Fingestor, ${name}!`,
      subtitle: 'Estamos felizes em ter você conosco',
      content: 'Agora você tem acesso completo a todas as ferramentas de controle financeiro para MEI.',
      
      featuresTitle: 'O que você pode fazer no Fingestor:',
      features: [
        {
          title: 'Controle de caixa simples',
          description: 'Registre entradas e saídas em poucos cliques'
        },
        {
          title: 'DRE automático',
          description: 'Saiba seu lucro real sem precisar de contador'
        },
        {
          title: 'Dashboard completo',
          description: 'Visualize a saúde financeira da sua empresa'
        }
      ],
      
      ctaUrl: 'https://fingestor.com.br/dashboard',
      ctaText: 'Acessar meu Dashboard',
      closingText: 'Bom trabalho e sucesso nos negócios!',
      unsubscribeUrl: `https://fingestor.com.br/unsubscribe?token=${unsubscribeToken}`
    });
    
    res.json({ success: true });
  }
}
```

## 📦 Instalação de Dependências

```bash
npm install resend handlebars
```

```bash
npm install --save-dev @types/handlebars
```

## 🔑 Variáveis de Ambiente

```env
# .env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

## 🧪 Testando o Template

### Script de Teste

```typescript
// scripts/test-newsletter.ts
import { EmailService } from '../src/services/email.service';

const emailService = new EmailService();

async function testNewsletter() {
  await emailService.sendNewsletter('seu-email@teste.com', {
    emailSubject: 'Teste de Newsletter',
    title: 'Newsletter de Teste',
    subtitle: 'Este é um teste do template',
    content: 'Testando o envio de newsletter com Resend.',
    
    infoBox: 'Este é um box informativo de teste',
    
    features: [
      { title: 'Feature 1', description: 'Descrição 1' },
      { title: 'Feature 2', description: 'Descrição 2' }
    ],
    
    ctaUrl: 'https://fingestor.com.br',
    ctaText: 'Testar Agora',
    
    unsubscribeUrl: 'https://fingestor.com.br/unsubscribe?token=test'
  });
  
  console.log('Newsletter enviada!');
}

testNewsletter();
```

Execute:
```bash
npx ts-node scripts/test-newsletter.ts
```

## 📊 Dashboard do Resend

Após configurar, você pode:

1. Ver estatísticas de entrega em: https://resend.com/emails
2. Monitorar taxa de abertura e cliques
3. Gerenciar listas de emails
4. Ver logs de erro

## ⚠️ Limitações e Boas Práticas

### Rate Limits
- **Plano gratuito**: 100 emails/dia
- **Plano pago**: 50.000+ emails/mês

### Tamanho do Email
- Máximo: **500KB** (HTML + imagens inline)
- Recomendado: < 100KB

### Boas Práticas
- ✅ Sempre inclua `unsubscribeUrl`
- ✅ Use domínio verificado no Resend
- ✅ Configure SPF, DKIM e DMARC
- ✅ Teste antes de enviar em massa
- ✅ Monitore bounce rate e spam complaints

## 🔗 Links Úteis

- [Resend Docs](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/emails)
- [Handlebars Docs](https://handlebarsjs.com/)

---

**Pronto para produção!** 🚀
