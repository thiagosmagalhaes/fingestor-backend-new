# API Notifications - Documentação

Endpoints para gerenciar notificações do usuário.

**Base URL**: `/api/notifications`

**Autenticação**: Requer token JWT no header `Authorization: Bearer <token>`

---

## Endpoints

### GET /api/notifications

Retorna todas as notificações da empresa.

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
{
  "notifications": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "user-uuid",
      "company_id": "company-uuid",
      "title": "Despesa vence hoje",
      "message": "Aluguel (R$ 1500.00) vence hoje",
      "type": "expense_due",
      "link_to": "/transactions/trans-id",
      "is_read": false,
      "created_at": "2026-01-21T10:00:00Z",
      "read_at": null
    }
  ],
  "unread_count": 5
}
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

---

### GET /api/notifications/unread-count

Retorna apenas a contagem de notificações não lidas.

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
{
  "unread_count": 5
}
```

---

### PATCH /api/notifications/:id/read

Marca uma notificação específica como lida.

#### URL Parameters:
- `id` (string, obrigatório) - ID da notificação

#### Respostas:

**200 OK**
```json
{
  "message": "Notificação marcada como lida"
}
```

**400 Bad Request**
```json
{
  "error": "id é obrigatório"
}
```

---

### PATCH /api/notifications/read-all

Marca todas as notificações da empresa como lidas.

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
{
  "message": "Todas as notificações foram marcadas como lidas"
}
```

---

### DELETE /api/notifications/:id

Deleta uma notificação.

#### URL Parameters:
- `id` (string, obrigatório) - ID da notificação

#### Respostas:

**200 OK**
```json
{
  "message": "Notificação deletada com sucesso"
}
```

---

### POST /api/notifications

Cria uma nova notificação manualmente.

#### Request Body:
```json
{
  "companyId": "company-uuid",
  "title": "Título da notificação",
  "message": "Mensagem detalhada",
  "type": "info",
  "linkTo": "/path/opcional"
}
```

#### Campos:
- `companyId` (string, obrigatório) - ID da empresa
- `title` (string, obrigatório) - Título da notificação
- `message` (string, obrigatório) - Mensagem detalhada
- `type` (string, obrigatório) - Tipo: `expense_due`, `expense_overdue`, `info`, `warning`
- `linkTo` (string, opcional) - Link para redirecionamento

#### Respostas:

**201 Created**
```json
{
  "id": "notif-uuid",
  "user_id": "user-uuid",
  "company_id": "company-uuid",
  "title": "Título da notificação",
  "message": "Mensagem detalhada",
  "type": "info",
  "link_to": "/path/opcional",
  "is_read": false,
  "created_at": "2026-01-21T10:00:00Z"
}
```

**400 Bad Request**
```json
{
  "error": "companyId, title, message e type são obrigatórios"
}
```

```json
{
  "error": "type deve ser: expense_due, expense_overdue, info ou warning"
}
```

---

## Tipos de Notificação

- `expense_due` - Despesa vencendo hoje
- `expense_overdue` - Despesa vencida
- `info` - Informação geral
- `warning` - Aviso importante

---

## Cron Job Automático

O sistema possui um job automático que executa **a cada 1 hora** e:

1. **Verifica transações que vencem hoje**
   - Cria notificação tipo `expense_due`
   - Apenas para transações pendentes (não pagas)
   - Não duplica notificações do mesmo dia

2. **Verifica transações vencidas**
   - Cria notificação tipo `expense_overdue`
   - Calcula quantos dias está vencida
   - Não duplica notificações do mesmo dia

### Regras do Cron:
- ✅ Ignora transações de cartão de crédito (apenas faturas importam)
- ✅ Só notifica transações com status `pending`
- ✅ Não cria notificações duplicadas no mesmo dia
- ✅ Executa automaticamente ao iniciar o servidor

---

## Exemplos de cURL

### Listar notificações
```bash
curl -X GET "http://localhost:3000/api/notifications?companyId=company-uuid" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Contagem de não lidas
```bash
curl -X GET "http://localhost:3000/api/notifications/unread-count?companyId=company-uuid" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Marcar como lida
```bash
curl -X PATCH "http://localhost:3000/api/notifications/notif-uuid/read" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Marcar todas como lidas
```bash
curl -X PATCH "http://localhost:3000/api/notifications/read-all?companyId=company-uuid" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Deletar notificação
```bash
curl -X DELETE "http://localhost:3000/api/notifications/notif-uuid" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Criar notificação
```bash
curl -X POST "http://localhost:3000/api/notifications" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "company-uuid",
    "title": "Lembrete importante",
    "message": "Não esqueça de revisar as contas",
    "type": "info",
    "linkTo": "/dashboard"
  }'
```

---

## Segurança

- ✅ Requer autenticação JWT
- ✅ Row Level Security (RLS) no Supabase
- ✅ Usuário só acessa suas próprias notificações
- ✅ Validação de `user_id` em todas as operações
