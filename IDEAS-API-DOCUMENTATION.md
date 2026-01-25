# IDEAS API DOCUMENTATION

API completa para o sistema de ideias, incluindo criação, votação e gerenciamento de status.

## Base URL
```
/api/ideas
```

## Authentication
Todos os endpoints requerem autenticação via Bearer token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Endpoints

### 1. Criar Ideia

Cria uma nova ideia. A ideia é criada automaticamente com status `pending`.

**Endpoint:** `POST /api/ideas`

**Request Body:**
```json
{
  "title": "Nova funcionalidade de exportação",
  "description": "Seria ótimo poder exportar transações em formato Excel para facilitar a análise de dados."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Nova funcionalidade de exportação",
    "description": "Seria ótimo poder exportar transações em formato Excel para facilitar a análise de dados.",
    "status": "pending",
    "created_at": "2026-01-24T10:30:00Z",
    "updated_at": "2026-01-24T10:30:00Z"
  }
}
```

---

### 2. Listar Ideias

Lista todas as ideias ordenadas por número de votos (mais votadas primeiro).

**Regras de visibilidade:**
- Usuários normais veem apenas ideias com status: `approved`, `in_progress`, `implemented`
- Usuários veem suas próprias ideias independente do status
- Admins veem todas as ideias

**Endpoint:** `GET /api/ideas`

**Query Parameters:**
- `status` (opcional): Filtrar por status específico (`pending`, `approved`, `in_progress`, `implemented`, `rejected`)

**Examples:**
```bash
GET /api/ideas
GET /api/ideas?status=approved
GET /api/ideas?status=in_progress
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Exportar transações em Excel",
      "description": "Funcionalidade para exportar dados em formato Excel",
      "status": "approved",
      "created_at": "2026-01-24T10:30:00Z",
      "updated_at": "2026-01-24T10:30:00Z",
      "vote_count": 15,
      "upvotes": 18,
      "downvotes": 3,
      "user_vote": 1
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "user_id": "123e4567-e89b-12d3-a456-426614174001",
      "title": "Dark mode",
      "description": "Adicionar tema escuro no sistema",
      "status": "in_progress",
      "created_at": "2026-01-23T09:15:00Z",
      "updated_at": "2026-01-24T08:20:00Z",
      "vote_count": 12,
      "upvotes": 14,
      "downvotes": 2,
      "user_vote": 0
    }
  ]
}
```

**Campos retornados:**
- `vote_count`: Total de votos (upvotes - downvotes)
- `upvotes`: Total de votos positivos
- `downvotes`: Total de votos negativos
- `user_vote`: Voto do usuário atual (1 = upvote, -1 = downvote, 0 = não votou)

---

### 3. Buscar Ideia por ID

Retorna detalhes de uma ideia específica.

**Endpoint:** `GET /api/ideas/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Exportar transações em Excel",
    "description": "Funcionalidade para exportar dados em formato Excel",
    "status": "approved",
    "created_at": "2026-01-24T10:30:00Z",
    "updated_at": "2026-01-24T10:30:00Z",
    "vote_count": 15,
    "upvotes": 18,
    "downvotes": 3,
    "user_vote": 1
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Idea not found"
}
```

---

### 4. Atualizar Ideia

Permite ao usuário atualizar sua própria ideia. Apenas ideias com status `pending` podem ser editadas.

**Endpoint:** `PUT /api/ideas/:id`

**Request Body:**
```json
{
  "title": "Exportar transações em Excel e PDF",
  "description": "Funcionalidade para exportar dados em formato Excel e PDF com gráficos"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Exportar transações em Excel e PDF",
    "description": "Funcionalidade para exportar dados em formato Excel e PDF com gráficos",
    "status": "pending",
    "created_at": "2026-01-24T10:30:00Z",
    "updated_at": "2026-01-24T11:45:00Z"
  },
  "message": "Idea updated successfully"
}
```

**Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "You can only update your own ideas"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Can only update pending ideas"
}
```

---

### 5. Votar em Ideia

Registra ou atualiza o voto do usuário em uma ideia. Apenas ideias aprovadas podem receber votos.

**Endpoint:** `POST /api/ideas/:id/vote`

**Request Body:**
```json
{
  "voteType": 1
}
```

**Vote Types:**
- `1`: Upvote (voto positivo)
- `-1`: Downvote (voto negativo)

**Response (201 Created) - Novo voto:**
```json
{
  "success": true,
  "message": "Vote registered successfully"
}
```

**Response (200 OK) - Voto atualizado:**
```json
{
  "success": true,
  "message": "Vote updated successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Can only vote on approved ideas"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Vote type must be 1 (upvote) or -1 (downvote)"
}
```

---

### 6. Remover Voto

Remove o voto do usuário de uma ideia.

**Endpoint:** `DELETE /api/ideas/:id/vote`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Vote removed successfully"
}
```

---

### 7. Atualizar Status da Ideia (Admin Only)

Permite ao administrador mudar o status de uma ideia. Apenas administradores podem executar esta ação.

**Endpoint:** `PATCH /api/ideas/:id/status`

**Request Body:**
```json
{
  "status": "approved"
}
```

**Status disponíveis:**
- `pending`: Pendente de aprovação (status inicial)
- `approved`: Aprovada (pode receber votos)
- `in_progress`: Em processo de implementação
- `implemented`: Implementada
- `rejected`: Rejeitada/Não aprovada

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Exportar transações em Excel",
    "description": "Funcionalidade para exportar dados em formato Excel",
    "status": "approved",
    "created_at": "2026-01-24T10:30:00Z",
    "updated_at": "2026-01-24T14:20:00Z"
  },
  "message": "Idea status updated successfully"
}
```

**Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

---

### 8. Deletar Ideia

Permite ao usuário deletar sua própria ideia. Apenas ideias com status `pending` podem ser deletadas.

**Endpoint:** `DELETE /api/ideas/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Idea deleted successfully"
}
```

**Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "You can only delete your own ideas"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Can only delete pending ideas"
}
```

---

## Fluxo de Trabalho

### Para Usuários:

1. **Criar ideia**: POST `/api/ideas` com título e descrição
2. **Ver suas ideias**: GET `/api/ideas` (mostra suas ideias independente do status)
3. **Aguardar aprovação**: Admin aprova a ideia mudando status para `approved`
4. **Votar em ideias**: POST `/api/ideas/:id/vote` com voteType 1 ou -1
5. **Acompanhar progresso**: Ver mudanças de status (`in_progress` → `implemented`)

### Para Administradores:

1. **Ver todas as ideias**: GET `/api/ideas` (inclui status `pending`)
2. **Filtrar pendentes**: GET `/api/ideas?status=pending`
3. **Aprovar ideia**: PATCH `/api/ideas/:id/status` com `status: "approved"`
4. **Marcar em desenvolvimento**: PATCH `/api/ideas/:id/status` com `status: "in_progress"`
5. **Marcar como implementada**: PATCH `/api/ideas/:id/status` com `status: "implemented"`
6. **Rejeitar ideia**: PATCH `/api/ideas/:id/status` com `status: "rejected"`

---

## Status da Ideia - Ciclo de Vida

```
pending (criação)
    ↓
approved (pode receber votos)
    ↓
in_progress (em desenvolvimento)
    ↓
implemented (concluída)

ou

pending → rejected (não aprovada)
```

---

## Regras de Negócio

1. **Criação de ideias**: Qualquer usuário autenticado pode criar
2. **Status inicial**: Sempre `pending`
3. **Votação**: Apenas em ideias com status `approved`, `in_progress` ou `implemented`
4. **Um voto por ideia**: Usuário pode votar apenas 1 vez, mas pode mudar o voto
5. **Ordenação**: Ideias ordenadas por vote_count (upvotes - downvotes)
6. **Edição**: Apenas o criador pode editar, e só se status for `pending`
7. **Deleção**: Apenas o criador pode deletar, e só se status for `pending`
8. **Mudança de status**: Apenas admins podem mudar status
9. **Visibilidade**: Usuários veem apenas ideias aprovadas (exceto suas próprias)

---

## Exemplos de Uso

### Criar e aprovar uma ideia:

```bash
# 1. Usuário cria ideia
curl -X POST http://localhost:3001/api/ideas \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Relatório de gastos mensais",
    "description": "Gerar relatório automático de gastos por categoria"
  }'

# 2. Admin aprova
curl -X PATCH http://localhost:3001/api/ideas/IDEA_ID/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'

# 3. Usuários votam
curl -X POST http://localhost:3001/api/ideas/IDEA_ID/vote \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"voteType": 1}'

# 4. Admin marca como em desenvolvimento
curl -X PATCH http://localhost:3001/api/ideas/IDEA_ID/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# 5. Admin marca como implementada
curl -X PATCH http://localhost:3001/api/ideas/IDEA_ID/status \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "implemented"}'
```

### Listar ideias mais votadas:

```bash
curl -X GET http://localhost:3001/api/ideas \
  -H "Authorization: Bearer USER_TOKEN"
```

### Mudar voto de downvote para upvote:

```bash
# Primeiro voto (downvote)
curl -X POST http://localhost:3001/api/ideas/IDEA_ID/vote \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"voteType": -1}'

# Mudar para upvote
curl -X POST http://localhost:3001/api/ideas/IDEA_ID/vote \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"voteType": 1}'
```

---

## Error Responses

Todos os endpoints podem retornar os seguintes erros:

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
  "message": "Access denied. Admin privileges required."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Idea not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to create idea",
  "error": "Error details here"
}
```
