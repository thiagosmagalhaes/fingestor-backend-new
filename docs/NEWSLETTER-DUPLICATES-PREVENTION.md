# Sistema de Prevenção de Duplicatas em Newsletters

## 📊 Visão Geral

O sistema de newsletters do Fingestor implementa um mecanismo robusto de prevenção de envios duplicados usando uma tabela de logs no banco de dados.

## 🗄️ Estrutura da Tabela `newsletter_logs`

```sql
CREATE TABLE newsletter_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  newsletter_type TEXT NOT NULL,
  email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB
);

-- Índices para otimização
CREATE INDEX idx_newsletter_logs_user_id ON newsletter_logs(user_id);
CREATE INDEX idx_newsletter_logs_type_sent ON newsletter_logs(newsletter_type, sent_at);
CREATE INDEX idx_newsletter_logs_user_type ON newsletter_logs(user_id, newsletter_type);
```

## 🔒 Como Funciona a Prevenção de Duplicatas

### 1. **Job de Trial Expirando** (`trial-expiring.job.ts`)

Antes de enviar qualquer email, o sistema:

1. **Verifica logs recentes** (últimas 24 horas):
```typescript
const { data: existingLog } = await supabaseAdmin
  .from('newsletter_logs')
  .select('id, sent_at')
  .eq('user_id', user.user_id)
  .eq('newsletter_type', 'trial_expiring')
  .gte('sent_at', twentyFourHoursAgo.toISOString())
  .single();

if (existingLog) {
  console.log('[SKIP] Pulando ' + user.email);
  skippedCount++;
  continue; // Não envia
}
```

2. **Registra o envio** (sucesso ou falha):
```typescript
await supabaseAdmin.from('newsletter_logs').insert({
  user_id: user.user_id,
  newsletter_type: 'trial_expiring',
  email: user.email,
  success: true,
  metadata: {
    days_remaining: daysRemaining,
    message_id: result.messageId
  }
});
```

### 2. **Relatório de Execução**

Cada execução do job exibe:
```
[RESUMO] Job de trial expirando:
   Enviados: 5
   Erros: 1
   Pulados: 3
   Total processados: 9
```

## ⏰ Cenários de Proteção

### Cenário 1: Job Executado Múltiplas Vezes no Mesmo Dia
- **Situação**: Job configurado incorretamente roda a cada hora
- **Proteção**: Só envia se última newsletter foi enviada há mais de 24 horas
- **Resultado**: Usuário recebe **apenas 1 email por dia**

### Cenário 2: Usuário Permanece no Intervalo de 12-13 Dias
- **Situação**: Job roda diariamente e usuário ainda está com 3 dias de trial
- **Proteção**: Mesmo que usuário seja encontrado novamente, já existe log de envio
- **Resultado**: **Sem duplicatas**

### Cenário 3: Falha no Envio
- **Situação**: Resend retorna erro ao enviar
- **Proteção**: Log registra `success: false` + `error_message`
- **Resultado**: Na próxima execução, **pode tentar novamente** após 24h

### Cenário 4: Job Interrompido no Meio
- **Situação**: Processo é morto antes de finalizar
- **Proteção**: Cada envio é registrado imediatamente após sucesso/falha
- **Resultado**: Usuários processados **não recebem duplicatas**, apenas os não processados serão enviados

## 🔍 Consultas Úteis

### Ver últimos envios
```sql
SELECT 
  nl.sent_at,
  nl.newsletter_type,
  nl.email,
  nl.success,
  nl.metadata->>'days_remaining' as dias_restantes
FROM newsletter_logs nl
WHERE nl.newsletter_type = 'trial_expiring'
ORDER BY nl.sent_at DESC
LIMIT 10;
```

### Usuários que receberam newsletter hoje
```sql
SELECT 
  p.full_name,
  nl.email,
  nl.sent_at
FROM newsletter_logs nl
JOIN profiles p ON p.user_id = nl.user_id
WHERE nl.newsletter_type = 'trial_expiring'
  AND nl.sent_at >= CURRENT_DATE
  AND nl.success = true;
```

### Detectar possíveis duplicatas
```sql
SELECT 
  user_id,
  email,
  COUNT(*) as envios,
  MIN(sent_at) as primeiro_envio,
  MAX(sent_at) as ultimo_envio
FROM newsletter_logs
WHERE newsletter_type = 'trial_expiring'
  AND sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY user_id, email
HAVING COUNT(*) > 1;
```

## 🎯 Tipos de Newsletter Suportados

- `welcome` - Boas-vindas após cadastro
- `trial_expiring` - Aviso de trial expirando
- `subscription_confirmed` - Confirmação de assinatura
- `updates` - Novidades e atualizações
- `custom` - Newsletters personalizadas

## 📝 Metadados Armazenados

Cada log pode conter metadados específicos:

```typescript
{
  "days_remaining": 3,
  "message_id": "abc123-def456",
  "plan_name": "Pro",
  "custom_field": "valor"
}
```

## ⚙️ Configuração

Para ajustar o período de proteção contra duplicatas:

```typescript
// Padrão: 24 horas
const twentyFourHoursAgo = new Date();
twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

// Para mudar para 48 horas:
twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 48);
```

## 🧪 Testando o Sistema

### Aplicar migração
```bash
# No Supabase Dashboard:
# SQL Editor > New Query > Colar conteúdo de:
# supabase/migrations/20260128000000_create_newsletter_logs.sql
```

### Executar job manualmente
```typescript
// Em src/index.ts ou console:
import { runTrialExpiringJobNow } from './jobs/trial-expiring.job';
await runTrialExpiringJobNow();
```

### Simular múltiplas execuções
```typescript
// Executar 3 vezes seguidas
await runTrialExpiringJobNow();
await runTrialExpiringJobNow();
await runTrialExpiringJobNow();

// Resultado esperado:
// 1ª execução: Envia emails normalmente
// 2ª execução: Pula todos (já enviados)
// 3ª execução: Pula todos (já enviados)
```

## ✅ Garantias do Sistema

1. ✅ **Nenhum usuário recebe o mesmo tipo de newsletter 2x em 24h**
2. ✅ **Logs persistem mesmo se job falhar**
3. ✅ **Índices otimizados para consultas rápidas**
4. ✅ **Cascata de exclusão ao deletar usuário**
5. ✅ **Visibilidade completa via logs e relatórios**

## 🚨 Monitoramento

Adicione alertas para:
- Taxa de erro > 10%
- Aumento súbito de "Pulados"
- Nenhum envio bem-sucedido em 24h
- Emails na fila por mais de 1 hora

## 📌 Próximos Passos

- [ ] Implementar cleanup de logs antigos (> 90 dias)
- [ ] Adicionar dashboard de analytics
- [ ] Integrar com sistema de alertas (ex: Sentry)
- [ ] Criar endpoint REST para consultar histórico
