# Job de Resumo Diário de Transações

Este documento descreve o funcionamento do job automático que envia emails diários com resumo das transações vencendo.

## 📋 Funcionalidades

O job de resumo diário:

1. **Executa automaticamente** todos os dias às 8h da manhã
2. **Envia emails** para usuários com assinatura ativa
3. **Organiza as transações por empresa** cadastrada
4. **Mostra contas a pagar e a receber** que vencem nos próximos 7 dias
5. **Evita duplicatas** - não envia se já enviou nas últimas 20 horas
6. **Pula usuários sem transações** vencendo no período

## 📊 Estrutura do Email

O email contém:

- **Saudação personalizada** com o nome do usuário
- **Resumo geral** com totais de contas a receber e a pagar
- **Seção por empresa** mostrando:
  - 💰 Contas a Receber (em verde)
  - 💸 Contas a Pagar (em vermelho)
  - Status de cada transação (vencendo hoje, em X dias, ou vencida)
- **Botão** para acessar o painel
- **Link** para cancelar recebimento de emails

## 🔧 Arquivos Criados/Modificados

### Novos Arquivos

1. **`src/jobs/daily-summary.job.ts`**
   - Job principal que busca e envia os resumos
   - Função `sendDailySummaries()` - processa todos os usuários
   - Função `startDailySummaryJob()` - agenda execução diária
   - Função `runDailySummaryJobNow()` - para testes manuais

2. **`templates/daily-summary-layout.html`**
   - Template HTML responsivo do email
   - Layout otimizado para desktop e mobile
   - Cores e formatação profissional

3. **`scripts/test-daily-summary.ts`**
   - Script de teste para executar o job manualmente
   - Útil para desenvolvimento e debug

### Arquivos Modificados

1. **`src/types/newsletter.types.ts`**
   - Adicionado tipo `DAILY_SUMMARY` ao enum `NewsletterType`
   - Interface `TransactionSummary` - estrutura de uma transação
   - Interface `CompanySummary` - estrutura de empresa com transações
   - Interface `DailySummaryData` - dados completos para o email

2. **`src/services/email.service.ts`**
   - Método `sendDailySummary()` - envia o email de resumo
   - Método `compileDailySummaryTemplate()` - compila o HTML do template
   - Carregamento do template no construtor

3. **`src/index.ts`**
   - Import do job de resumo diário
   - Chamada para `startDailySummaryJob()` na inicialização

## 🚀 Como Usar

### Produção

O job é iniciado automaticamente quando o servidor sobe:

```typescript
// Em src/index.ts
startDailySummaryJob();
```

### Testes

Para testar manualmente sem esperar até às 8h:

```bash
npx ts-node scripts/test-daily-summary.ts
```

Ou via código:

```typescript
import { runDailySummaryJobNow } from './jobs/daily-summary.job';

await runDailySummaryJobNow();
```

## 📅 Critérios de Envio

Um usuário receberá o email SE:

1. ✅ Tem assinatura ativa ou em trial
2. ✅ Tem pelo menos uma empresa ativa
3. ✅ Tem transações pendentes vencendo nos próximos 7 dias
4. ✅ Não recebeu resumo nas últimas 20 horas

O email NÃO será enviado SE:

1. ❌ Não tem assinatura ativa
2. ❌ Não tem empresas cadastradas
3. ❌ Não tem transações vencendo nos próximos 7 dias
4. ❌ Já recebeu resumo recentemente

## 🔍 Transações Incluídas

O resumo mostra transações que:

- Status = `pending` (pendente)
- Data entre hoje e +7 dias
- Não são de cartão de crédito (`is_credit_card = false`)
- Pertencem a empresas ativas do usuário

## 📝 Log de Envios

Cada envio é registrado na tabela `newsletter_logs` com:

```typescript
{
  user_id: string,
  newsletter_type: 'daily_summary',
  email_sent_to: string,
  resend_message_id: string,
  sent_at: timestamp
}
```

Isso permite:
- Rastreamento de emails enviados
- Prevenção de duplicatas
- Debugging e auditoria

## 🎨 Customização

### Alterar Horário de Envio

Em `src/jobs/daily-summary.job.ts`:

```typescript
// Mudar de 8h para outro horário
nextRun.setHours(8, 0, 0, 0); // ← alterar aqui
```

### Alterar Período de Busca

Atualmente busca transações nos próximos 7 dias. Para alterar:

```typescript
const sevenDaysFromNow = new Date(today);
sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7); // ← alterar aqui
```

### Customizar Template

Edite o arquivo `templates/daily-summary-layout.html` para alterar:
- Cores e estilos
- Textos e mensagens
- Layout e estrutura

## 🔐 Variáveis de Ambiente

O job utiliza:

```env
RESEND_API_KEY=re_xxxxx           # API key do Resend
RESEND_FROM_EMAIL=nome@email.com  # Email remetente
FRONTEND_URL=https://fingestor.com # URL para links
```

## 🐛 Debug

Para ver logs detalhados:

```bash
# Logs principais
[DAILY SUMMARY] Iniciando envio de resumos diários...
[INFO] Encontrados X usuário(s) com assinatura ativa
[SUCCESS] email@example.com - Resumo enviado
[SKIP] email@example.com - sem transações vencendo
[ERROR] email@example.com - Falha no envio

# Resumo final
[DAILY SUMMARY] Finalizado: {
  total: 10,
  sucesso: 7,
  erros: 1,
  pulados: 2
}
```

## 📧 Exemplo de Email

O email mostra algo como:

```
📊 Resumo Diário

Olá, João! 👋

Aqui está o resumo das suas transações que estão vencendo nos próximos 7 dias:

┌─────────────────────────┐
│ A Receber: R$ 5.000,00  │
│ A Pagar:   R$ 2.500,00  │
└─────────────────────────┘

🏢 Empresa XYZ Ltda

💰 Contas a Receber (R$ 3.000,00)
- Cliente ABC       R$ 1.500,00  📅 Vence em 2 dia(s)
- Cliente DEF       R$ 1.500,00  ⏰ Vence hoje

💸 Contas a Pagar (R$ 1.000,00)
- Fornecedor GHI    R$ 1.000,00  🔴 Vencida há 1 dia(s)

[Botão: 📱 Acessar Painel]
```

## ✅ Próximos Passos

Possíveis melhorias futuras:

- [ ] Permitir usuário escolher horário de recebimento
- [ ] Permitir usuário escolher dias da semana
- [ ] Adicionar gráficos/charts no email
- [ ] Enviar resumo semanal além do diário
- [ ] Permitir customização do período (3, 7, 15 dias)
- [ ] Adicionar previsão de fluxo de caixa

## 🤝 Suporte

Em caso de dúvidas ou problemas:

1. Verifique os logs do servidor
2. Execute o teste manual com `test-daily-summary.ts`
3. Verifique configuração do Resend (API key, etc)
4. Verifique tabela `newsletter_logs` no banco
