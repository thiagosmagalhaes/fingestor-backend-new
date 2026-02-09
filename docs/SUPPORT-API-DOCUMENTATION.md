# SUPPORT/HELPDESK API DOCUMENTATION

Sistema completo de helpdesk com tickets de suporte e conversas entre usuários e equipe de suporte.

## Base URL
```
/api/support
```

## Authentication
Todos os endpoints requerem autenticação via Bearer token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Detecção de Admin no Frontend:**
Todos os endpoints de consulta (GET) retornam um campo `is_admin: boolean` na resposta, indicando se o usuário autenticado é um administrador. Use esse campo para mostrar/ocultar funcionalidades administrativas na interface.

---

## Visibilidade e Permissões

### Usuários Normais
- Veem apenas seus próprios tickets
- Podem criar tickets
- Podem enviar mensagens em seus tickets
- Podem fechar seus próprios tickets
- **NÃO** podem mudar status para `in_progress`

### Administradores (role = 'admin')
- Veem **todos** os tickets do sistema
- Recebem `user_email` e `user_name` de quem criou cada ticket nas listagens
- Podem enviar mensagens em qualquer ticket
- Podem mudar status para `in_progress`
- Podem fechar qualquer ticket
- Suas mensagens são marcadas com `is_admin: true`

---

## Status dos Tickets

- `open`: Ticket aberto, aguardando atendimento (status inicial)
- `in_progress`: Em atendimento (apenas admin pode definir)
- `closed`: Ticket fechado (usuário ou admin podem fechar)

---

## Notificações Automáticas

O sistema cria notificações automaticamente:
- **Quando admin responde**: Notifica o criador do ticket
- **Quando usuário responde**: Notifica todos os admins

---

## Endpoints

### 1. Criar Ticket de Suporte

Cria um novo ticket de suporte. Inicia automaticamente com status `open`.

**Endpoint:** `POST /api/support`

**Request Body:**
```json
{
  "title": "Problema ao exportar relatório",
  "description": "<p>Não consigo exportar o relatório de <strong>transações</strong> do último mês.</p><p>O botão não responde quando clico.</p>"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Problema ao exportar relatório",
    "description": "<p>Não consigo exportar o relatório de <strong>transações</strong> do último mês.</p><p>O botão não responde quando clico.</p>",
    "status": "open",
    "created_at": "2026-01-24T15:30:00Z",
    "updated_at": "2026-01-24T15:30:00Z",
    "closed_at": null,
    "closed_by": null
  }
}
```

---

### 2. Listar Tickets

Lista tickets de acordo com permissões do usuário.

**Endpoint:** `GET /api/support`

**Query Parameters:**
- `status` (opcional): Filtrar por status (`open`, `in_progress`, `closed`)

**Examples:**
```bash
GET /api/support
GET /api/support?status=open
GET /api/support?status=in_progress
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Problema ao exportar relatório",
      "description": "<p>Não consigo exportar o relatório...</p>",
      "status": "in_progress",
      "created_at": "2026-01-24T15:30:00Z",
      "updated_at": "2026-01-24T16:45:00Z",
      "closed_at": null,
      "closed_by": null,
      "message_count": 5,
      "last_message_at": "2026-01-24T16:45:00Z",
      "has_unread": true,
      "user_email": "usuario@example.com",
      "user_name": "João Silva"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Dúvida sobre assinatura",
      "description": "<p>Como faço para trocar meu plano?</p>",
      "status": "closed",
      "created_at": "2026-01-23T10:15:00Z",
      "updated_at": "2026-01-23T14:20:00Z",
      "closed_at": "2026-01-23T14:20:00Z",
      "closed_by": "789e4567-e89b-12d3-a456-426614174999",
      "message_count": 3,
      "last_message_at": "2026-01-23T14:20:00Z",
      "has_unread": false,
      "user_email": "usuario@example.com",
      "user_name": "João Silva"
    }
  ],
  "is_admin": true
}
```

**Campos retornados:**
- `message_count`: Número total de mensagens no ticket
- `last_message_at`: Data/hora da última mensagem
- `has_unread`: Indica se há mensagens não lidas (para usuário ou admin)
- `user_email`: Email de quem criou o ticket (apenas para admins)
- `user_name`: Nome completo de quem criou o ticket (apenas para admins)
- `is_admin`: Indica se o usuário autenticado é admin

---

### 3. Buscar Ticket por ID

Retorna detalhes de um ticket específico.

**Endpoint:** `GET /api/support/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Problema ao exportar relatório",
    "description": "<p>Não consigo exportar o relatório de <strong>transações</strong> do último mês.</p>",
    "status": "in_progress",
    "created_at": "2026-01-24T15:30:00Z",
    "updated_at": "2026-01-24T16:45:00Z",
    "closed_at": null,
    "closed_by": null,
    "user_email": "usuario@example.com",
    "user_name": "João Silva"
  },
  "is_admin": true
}
```

**Nota:** Os campos `user_email` e `user_name` são retornados apenas quando o usuário autenticado é admin. Usuários normais veem apenas seus próprios tickets sem esses campos extras.

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Support ticket not found"
}
```

---

### 4. Listar Mensagens do Ticket

Retorna todas as mensagens de um ticket em ordem cronológica.

**Endpoint:** `GET /api/support/:id/messages`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "ticket_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "message": "<p>Não consigo exportar o relatório de transações.</p>",
      "is_admin": false,
      "created_at": "2026-01-24T15:30:00Z",
      "user_name": "João"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "ticket_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "789e4567-e89b-12d3-a456-426614174999",
      "message": "<p>Olá! Vou verificar esse problema para você. Qual navegador está usando?</p>",
      "is_admin": true,
      "created_at": "2026-01-24T15:45:00Z",
      "user_name": "Maria"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "ticket_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "message": "<p>Estou usando o Chrome, versão mais recente.</p>",
      "is_admin": false,
      "created_at": "2026-01-24T16:00:00Z",
      "user_name": "João"
    }
  ],
  "is_admin": false
}
```

**Campos:**
- `is_admin` (na mensagem): `true` se mensagem foi enviada por admin, `false` se foi pelo usuário
- `is_admin` (no response): Indica se o usuário autenticado atual é admin
- `user_name`: Primeiro nome do usuário que enviou a mensagem (extraído de `profiles.full_name`)

---

### 5. Enviar Mensagem no Ticket

Adiciona uma mensagem à conversa do ticket. Cria notificação automática para o destinatário.

**Endpoint:** `POST /api/support/:id/messages`

**Request Body:**
```json
{
  "message": "<p>Obrigado pela ajuda! Consegui resolver limpando o cache do navegador.</p>"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "ticket_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "<p>Obrigado pela ajuda! Consegui resolver limpando o cache do navegador.</p>",
    "is_admin": false,
    "created_at": "2026-01-24T16:45:00Z"
  }
}
```

**Response (400 Bad Request) - Ticket fechado:**
```json
{
  "success": false,
  "message": "Cannot add messages to closed tickets"
}
```

**Comportamento:**
- O campo `is_admin` é definido automaticamente baseado no role do usuário
- Atualiza automaticamente o `updated_at` do ticket
- Cria notificação para o destinário apropriado
- Tickets fechados não aceitam novas mensagens

---

### 6. Atualizar Status do Ticket

Muda o status do ticket conforme regras de permissão.

**Endpoint:** `PATCH /api/support/:id/status`

**Request Body:**
```json
{
  "status": "in_progress"
}
```

**Status disponíveis:**
- `open`: Ticket aberto
- `in_progress`: Em atendimento (apenas admin)
- `closed`: Fechado (usuário fecha o seu, admin fecha qualquer)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Problema ao exportar relatório",
    "description": "<p>Não consigo exportar o relatório...</p>",
    "status": "in_progress",
    "created_at": "2026-01-24T15:30:00Z",
    "updated_at": "2026-01-24T17:00:00Z",
    "closed_at": null,
    "closed_by": null
  },
  "message": "Ticket status updated successfully"
}
```

**Response (403 Forbidden) - Usuário tentando marcar como in_progress:**
```json
{
  "success": false,
  "message": "Only admins can change status to in_progress"
}
```

**Response (403 Forbidden) - Usuário tentando fechar ticket de outro:**
```json
{
  "success": false,
  "message": "You can only close your own tickets"
}
```

**Comportamento ao fechar:**
- Define `closed_at` com timestamp atual
- Define `closed_by` com ID do usuário que fechou
- Ao reabrir (mudar para `open` ou `in_progress`), limpa `closed_at` e `closed_by`

---

## Fluxo de Trabalho

### Para Usuários:

1. **Criar ticket**: POST `/api/support` com título e descrição
2. **Acompanhar tickets**: GET `/api/support` (vê apenas seus tickets)
3. **Ver conversa**: GET `/api/support/:id/messages`
4. **Responder**: POST `/api/support/:id/messages` com mensagem
5. **Receber notificação**: Quando admin responde
6. **Fechar ticket**: PATCH `/api/support/:id/status` com `status: "closed"`

### Para Administradores:

1. **Ver todos os tickets**: GET `/api/support` (vê tickets de todos)
2. **Filtrar abertos**: GET `/api/support?status=open`
3. **Marcar em atendimento**: PATCH `/api/support/:id/status` com `status: "in_progress"`
4. **Responder**: POST `/api/support/:id/messages` (usuário recebe notificação)
5. **Fechar ticket**: PATCH `/api/support/:id/status` com `status: "closed"`

---

## Ciclo de Vida do Ticket

```
open (criação)
    ↓
in_progress (admin marca como em atendimento)
    ↓
closed (usuário ou admin fecha)

ou

open → closed (resolvido diretamente)
```

---

## Regras de Negócio

1. **Criação**: Qualquer usuário autenticado pode criar tickets
2. **Status inicial**: Sempre `open`
3. **Visibilidade**: Usuário vê apenas seus tickets, admin vê todos
4. **Mensagens em tickets fechados**: Não permitido
5. **Status "in_progress"**: Apenas admin pode definir
6. **Fechar ticket**: Usuário fecha o seu, admin fecha qualquer
7. **Notificações automáticas**: Criadas sempre que há resposta
8. **Sanitização HTML**: Descrição e mensagens são sanitizadas
9. **Campo is_admin**: Definido automaticamente pelo sistema

---

## Exemplos de Uso

### Fluxo completo de atendimento:

```bash
# 1. Usuário cria ticket
curl -X POST http://localhost:3001/api/support \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Erro ao processar pagamento",
    "description": "<p>Meu cartão foi recusado mas o valor foi cobrado.</p>"
  }'

# 2. Admin lista tickets pendentes
curl -X GET "http://localhost:3001/api/support?status=open" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 3. Admin marca como em atendimento
curl -X PATCH http://localhost:3001/api/support/TICKET_ID/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# 4. Admin responde (usuário recebe notificação)
curl -X POST http://localhost:3001/api/support/TICKET_ID/messages \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "<p>Vou verificar a transação. Pode me passar os últimos 4 dígitos do cartão?</p>"
  }'

# 5. Usuário responde (admin recebe notificação)
curl -X POST http://localhost:3001/api/support/TICKET_ID/messages \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "<p>Últimos dígitos: 1234</p>"
  }'

# 6. Admin resolve e fecha
curl -X POST http://localhost:3001/api/support/TICKET_ID/messages \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "<p>Verificamos e realmente houve um erro. O valor foi estornado. Problema resolvido!</p>"
  }'

curl -X PATCH http://localhost:3001/api/support/TICKET_ID/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "closed"}'
```

### Usuário fecha seu próprio ticket:

```bash
curl -X PATCH http://localhost:3001/api/support/TICKET_ID/status \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "closed"}'
```

### Admin lista todos os tickets:

```bash
curl -X GET http://localhost:3001/api/support \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Segurança

### HTML Sanitization
Campos `description` e `message` são sanitizados para prevenir XSS:

**Tags permitidas:**
- `<p>`, `<br>`, `<strong>`, `<em>`, `<u>`
- `<h1>`, `<h2>`, `<h3>`, `<h4>`
- `<ul>`, `<ol>`, `<li>`, `<blockquote>`

**Bloqueados:**
- Scripts: `<script>` removido
- Links: `<a>` removido
- Eventos: `onclick`, etc. removidos
- Estilos inline perigosos

### Row Level Security (RLS)
Implementado no Supabase para garantir que:
- Usuários vejam apenas seus tickets
- Admins vejam todos os tickets
- Mensagens seguem a visibilidade do ticket

---

## Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Token de autenticação não fornecido"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Only admins can change status to in_progress"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Support ticket not found"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Cannot add messages to closed tickets"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to create support ticket",
  "error": "Error details here"
}
```
