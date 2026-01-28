# Unsubscribe API - Sistema de Descadastramento de Newsletters

## Visão Geral

Sistema completo para gerenciar descadastramento (unsubscribe) de newsletters do Fingestor. Permite que usuários cancelem ou reativem suas inscrições via link recebido por email.

## Endpoints

### 1. Descadastrar (Unsubscribe)

**Endpoint:** `GET /api/unsubscribe?token={token}`

Descadastra usuário das newsletters. Este link é enviado no rodapé de todos os emails.

**Parâmetros:**
- `token` (query, obrigatório): Token de autenticação gerado no email

**Exemplo de uso:**
```bash
GET http://localhost:3001/api/unsubscribe?token=abc123def456...
```

**Resposta de sucesso (200 OK):**
```json
{
  "success": true,
  "message": "Voce foi descadastrado com sucesso das newsletters do Fingestor",
  "email": "usuario@exemplo.com"
}
```

**Resposta de erro - Token inválido (400 Bad Request):**
```json
{
  "success": false,
  "message": "Token invalido ou nao fornecido"
}
```

**Resposta de erro - Usuário não encontrado (404 Not Found):**
```json
{
  "success": false,
  "message": "Usuario nao encontrado"
}
```

---

### 2. Reinscrever (Resubscribe)

**Endpoint:** `POST /api/unsubscribe/resubscribe`

Permite que usuário se reinscreva nas newsletters após ter cancelado.

**Body da requisição:**
```json
{
  "token": "abc123def456..."
}
```

**Exemplo de uso:**
```bash
curl -X POST "http://localhost:3001/api/unsubscribe/resubscribe" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123def456..."
  }'
```

**Resposta de sucesso (200 OK):**
```json
{
  "success": true,
  "message": "Voce foi reinscrito com sucesso nas newsletters do Fingestor",
  "email": "usuario@exemplo.com"
}
```

**Resposta de erro - Token inválido (400 Bad Request):**
```json
{
  "success": false,
  "message": "Token invalido ou nao fornecido"
}
```

---

### 3. Verificar Status de Inscrição

**Endpoint:** `GET /api/unsubscribe/status?token={token}`

Verifica se usuário está inscrito ou descadastrado das newsletters.

**Parâmetros:**
- `token` (query, obrigatório): Token de autenticação

**Exemplo de uso:**
```bash
GET http://localhost:3001/api/unsubscribe/status?token=abc123def456...
```

**Resposta de sucesso - Inscrito (200 OK):**
```json
{
  "success": true,
  "email": "usuario@exemplo.com",
  "subscribed": true,
  "unsubscribed_at": null
}
```

**Resposta de sucesso - Descadastrado (200 OK):**
```json
{
  "success": true,
  "email": "usuario@exemplo.com",
  "subscribed": false,
  "unsubscribed_at": "2026-01-28T15:30:00.000Z"
}
```

---

## Como Funciona

### 1. Geração do Token

O token de unsubscribe é um hash SHA256 único gerado para cada usuário:

```typescript
const token = crypto
  .createHash('sha256')
  .update(user_id + JWT_SECRET)
  .digest('hex');
```

Este token é incluído em todas as newsletters:

```typescript
const unsubscribeUrl = `${FRONTEND_URL}/unsubscribe?token=${token}`;
```

### 2. Estrutura do Banco de Dados

Tabela `newsletter_preferences`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único |
| user_id | UUID | Referência ao usuário |
| email | TEXT | Email do usuário |
| subscribed | BOOLEAN | Status de inscrição (true/false) |
| unsubscribed_at | TIMESTAMP | Data do descadastramento |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Última atualização |

### 3. Fluxo de Descadastramento

```
1. Usuário recebe newsletter
   ↓
2. Clica no link "Descadastrar" no rodapé
   ↓
3. GET /api/unsubscribe?token=...
   ↓
4. Sistema valida token e identifica usuário
   ↓
5. Atualiza newsletter_preferences.subscribed = false
   ↓
6. Retorna mensagem de confirmação
```

### 4. Verificação Antes de Enviar

Antes de enviar qualquer newsletter, o sistema deve verificar:

```typescript
const { data } = await supabase
  .from('newsletter_preferences')
  .select('subscribed')
  .eq('user_id', userId)
  .single();

if (data && !data.subscribed) {
  console.log('Usuario descadastrado, nao enviar newsletter');
  return;
}
```

---

## Integração com Frontend

### Página de Unsubscribe

Crie uma página em `FRONTEND_URL/unsubscribe` que:

1. **Extrai o token da URL:**
```typescript
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
```

2. **Chama a API:**
```typescript
const response = await fetch(`/api/unsubscribe?token=${token}`);
const data = await response.json();
```

3. **Exibe confirmação:**
```jsx
{data.success ? (
  <div>
    <h1>Você foi descadastrado</h1>
    <p>Não enviaremos mais newsletters para {data.email}</p>
    <button onClick={resubscribe}>Quero me reinscrever</button>
  </div>
) : (
  <div>
    <h1>Erro</h1>
    <p>{data.message}</p>
  </div>
)}
```

### Reininscrição

```typescript
async function resubscribe() {
  const response = await fetch('/api/unsubscribe/resubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  
  const data = await response.json();
  
  if (data.success) {
    alert('Você foi reinscrito com sucesso!');
  }
}
```

---

## Exemplo de Email com Unsubscribe

O link de descadastramento já está incluído no template de email (`templates/newsletter-layout.html`):

```html
<tr>
  <td style="padding:20px 0;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">
      Não quer mais receber nossos emails? 
      <a href="{{unsubscribeUrl}}" style="color:#9ca3af;text-decoration:underline;">
        Descadastrar
      </a>
    </p>
  </td>
</tr>
```

O `{{unsubscribeUrl}}` será substituído por:
```
https://fingestor.com.br/unsubscribe?token=abc123def456...
```

---

## Testes

### 1. Testar Descadastramento

```bash
# 1. Fazer login para obter user_id
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "teste@exemplo.com", "password": "senha123"}'

# 2. Gerar token manualmente (ou pegar de um email)
# Token = SHA256(user_id + JWT_SECRET)

# 3. Descadastrar
curl "http://localhost:3001/api/unsubscribe?token=SEU_TOKEN_AQUI"

# 4. Verificar status
curl "http://localhost:3001/api/unsubscribe/status?token=SEU_TOKEN_AQUI"
```

### 2. Testar Reinscrição

```bash
curl -X POST "http://localhost:3001/api/unsubscribe/resubscribe" \
  -H "Content-Type: application/json" \
  -d '{"token": "SEU_TOKEN_AQUI"}'
```

---

## Migração do Banco de Dados

Execute a migração SQL para criar a tabela:

```bash
# Via Supabase CLI
supabase db push

# Ou cole o SQL manualmente no Supabase Dashboard:
# SQL Editor > New Query > Cole o conteúdo de:
# supabase/migrations/20260128010000_create_newsletter_preferences.sql
```

---

## Políticas de Privacidade (RLS)

A tabela `newsletter_preferences` tem Row Level Security (RLS) habilitado:

- ✅ Usuários podem **ver** apenas suas próprias preferências
- ✅ Usuários podem **atualizar** apenas suas próprias preferências
- ✅ Sistema pode **inserir** novas preferências (via service role)

---

## Boas Práticas

### ✅ Sempre Incluir Link de Unsubscribe

Lei CAN-SPAM (EUA) e LGPD (Brasil) exigem link de descadastramento em emails comerciais.

### ✅ Processar Imediatamente

Usuário deve ser descadastrado **imediatamente** ao clicar no link, sem necessidade de login.

### ✅ Confirmar Visualmente

Sempre exiba mensagem clara de confirmação após descadastramento.

### ✅ Permitir Reinscrição

Facilite o processo de reinscrição caso usuário mude de ideia.

### ✅ Verificar Antes de Enviar

**SEMPRE** verifique `newsletter_preferences.subscribed` antes de enviar qualquer email.

---

## Próximos Passos

- [ ] Adicionar verificação de `subscribed` em todos os métodos de envio
- [ ] Criar página de unsubscribe no frontend
- [ ] Adicionar analytics de descadastramentos
- [ ] Implementar preferências granulares (escolher tipos de email)
- [ ] Adicionar double opt-in para reininscrições
