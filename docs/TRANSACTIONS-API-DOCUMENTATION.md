# API de Transações - Documentação

Endpoints para gerenciar transações (receitas e despesas) das empresas.

**Base URL**: `/api/transactions`

**Autenticação**: Todas as rotas requerem token JWT no header `Authorization: Bearer <token>`

---

## Endpoints

### 1. Listar Transações
**GET** `/api/transactions?companyId={id}&filter={filter}&searchQuery={query}&dateFrom={date}&dateTo={date}&categoryFilter={id}&statusFilter={status}&from={num}&to={num}`

Lista todas as transações de uma empresa com filtros avançados e paginação.

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa
- `filter` (string, opcional) - Filtro rápido: `income`, `expense`, `scheduled`, `pending`
- `searchQuery` (string, opcional) - Busca por descrição (case-insensitive)
- `dateFrom` (string, opcional) - Data inicial (formato: YYYY-MM-DD)
- `dateTo` (string, opcional) - Data final (formato: YYYY-MM-DD)
- `categoryFilter` (string, opcional) - ID da categoria ou `all`
- `statusFilter` (string, opcional) - Status: `all`, `paid`, `pending`, `scheduled`, `overdue`
- `from` (string, opcional) - Índice inicial para paginação (padrão: 0)
- `to` (string, opcional) - Índice final para paginação (padrão: 49)

#### Filtros Especiais:
- **overdue**: Retorna transações vencidas (status `pending` ou `scheduled` com data anterior a hoje)
- **searchQuery**: Busca em qualquer parte da descrição

#### Respostas:

**200 OK**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "description": "Pagamento Cliente XYZ",
      "amount": 5000.00,
      "type": "income",
      "categoryId": "660e8400-e29b-41d4-a716-446655440001",
      "companyId": "123e4567-e89b-12d3-a456-426614174000",
      "date": "2026-01-15T03:00:00.000Z",
      "dueDate": undefined,
      "paidAt": "2026-01-15T13:30:00.000Z",
      "paymentDate": "2026-01-15T13:30:00.000Z",
      "status": "paid",
      "isInstallment": false,
      "installmentNumber": undefined,
      "totalInstallments": undefined,
      "isCreditCard": false,
      "creditCardId": undefined,
      "creditCardName": undefined,
      "notes": undefined,
      "invoicePaidAt": undefined,
      "createdAt": "2026-01-15T12:00:00.000Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "description": "Compra no Mercado",
      "amount": 250.50,
      "type": "expense",
      "categoryId": "880e8400-e29b-41d4-a716-446655440003",
      "companyId": "123e4567-e89b-12d3-a456-426614174000",
      "date": "2026-01-18T03:00:00.000Z",
      "dueDate": "2026-02-10T03:00:00.000Z",
      "paidAt": undefined,
      "paymentDate": "2026-02-10T03:00:00.000Z",
      "status": "pending",
      "isInstallment": true,
      "installmentNumber": 1,
      "totalInstallments": 3,
      "isCreditCard": true,
      "creditCardId": "990e8400-e29b-41d4-a716-446655440004",
      "creditCardName": "Nubank",
      "notes": "Compras mensais",
      "invoicePaidAt": undefined,
      "createdAt": "2026-01-18T18:20:00.000Z"
    }
  ],
  "count": 150
}
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

#### Exemplo cURL:
```bash
# Listar todas transações (primeira página)
curl -X GET "http://localhost:3000/api/transactions?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar por período com paginação
curl -X GET "http://localhost:3000/api/transactions?companyId=123e4567-e89b-12d3-a456-426614174000&dateFrom=2026-01-01&dateTo=2026-01-31&from=0&to=49" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar por tipo de transação
curl -X GET "http://localhost:3000/api/transactions?companyId=123e4567-e89b-12d3-a456-426614174000&filter=expense" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Buscar por descrição
curl -X GET "http://localhost:3000/api/transactions?companyId=123e4567-e89b-12d3-a456-426614174000&searchQuery=mercado" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Buscar transações vencidas
curl -X GET "http://localhost:3000/api/transactions?companyId=123e4567-e89b-12d3-a456-426614174000&statusFilter=overdue" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Filtrar por categoria e status
curl -X GET "http://localhost:3000/api/transactions?companyId=123e4567-e89b-12d3-a456-426614174000&categoryFilter=660e8400-e29b-41d4-a716-446655440001&statusFilter=paid" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Obter Transação Específica
**GET** `/api/transactions/:id?companyId={companyId}`

Retorna os detalhes de uma transação específica com dados de categoria e cartão.

#### Path Parameters:
- `id` (string, obrigatório) - ID da transação

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "category_id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "expense",
  "description": "Notebook Dell",
  "amount": 3500.00,
  "date": "2026-01-10",
  "status": "paid",
  "payment_date": "2026-02-15T00:00:00Z",
  "is_installment": true,
  "installment_number": 1,
  "total_installments": 10,
  "credit_card_id": "990e8400-e29b-41d4-a716-446655440004",
  "notes": "Upgrade equipamento",
  "created_at": "2026-01-10T14:00:00Z",
  "updated_at": "2026-01-10T14:00:00Z",
  "category": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Equipamentos",
    "type": "expense",
    "color": "#8B5CF6"
  },
  "credit_card": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "name": "Nubank",
    "brand": "mastercard"
  }
}
```

**404 Not Found**
```json
{
  "error": "Transação não encontrada"
}
```

#### Exemplo cURL:
```bash
curl -X GET "http://localhost:3000/api/transactions/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Criar Transação
**POST** `/api/transactions`

Cria uma nova transação.

#### Body (JSON):
```json
{
  "companyId": "123e4567-e89b-12d3-a456-426614174000",
  "categoryId": "660e8400-e29b-41d4-a716-446655440001",
  "type": "expense",
  "description": "Aluguel Janeiro",
  "amount": 2500.00,
  "date": "2026-01-05",
  "status": "paid",
  "paymentDate": "2026-01-05T10:00:00Z",
  "notes": "Aluguel escritório"
}
```

#### Campos:
- `companyId` (string, obrigatório) - ID da empresa
- `categoryId` (string, obrigatório) - ID da categoria
- `type` (string, obrigatório) - Tipo: `income` ou `expense`
- `description` (string, obrigatório) - Descrição (mínimo 2 caracteres)
- `amount` (number, obrigatório) - Valor (deve ser > 0)
- `date` (string, obrigatório) - Data da transação (formato: YYYY-MM-DD)
- `status` (string, obrigatório) - Status: `paid`, `pending` ou `scheduled`
- `paymentDate` (string, opcional) - Data efetiva do pagamento (ISO 8601)
- `isInstallment` (boolean, opcional) - Se é parcelado (default: false)
- `installmentNumber` (number, opcional) - Número da parcela (requer isInstallment=true)
- `totalInstallments` (number, opcional) - Total de parcelas (≥ 2, requer isInstallment=true)
- `creditCardId` (string, opcional) - ID do cartão de crédito
- `notes` (string, opcional) - Observações

#### Validações:
- ✅ Descrição deve ter pelo menos 2 caracteres
- ✅ Valor deve ser maior que zero
- ✅ Tipo deve ser "income" ou "expense"
- ✅ Status deve ser válido
- ✅ Se parcelado: número da parcela ≥ 1, total ≥ 2, número ≤ total
- ✅ Categoria deve existir e pertencer à empresa
- ✅ Cartão (se fornecido) deve existir e pertencer à empresa

#### Respostas:

**201 Created**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "category_id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "expense",
  "description": "Aluguel Janeiro",
  "amount": 2500.00,
  "date": "2026-01-05",
  "status": "paid",
  "payment_date": "2026-01-05T10:00:00Z",
  "is_installment": false,
  "installment_number": null,
  "total_installments": null,
  "credit_card_id": null,
  "notes": "Aluguel escritório",
  "created_at": "2026-01-20T14:00:00Z",
  "updated_at": "2026-01-20T14:00:00Z",
  "category": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Aluguel",
    "type": "expense",
    "color": "#EF4444"
  },
  "credit_card": null
}
```

**400 Bad Request**
```json
{
  "error": "Valor deve ser maior que zero"
}
```

**404 Not Found**
```json
{
  "error": "Categoria não encontrada ou não pertence a esta empresa"
}
```

#### Exemplo cURL:
```bash
# Transação simples
curl -X POST "http://localhost:3000/api/transactions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "categoryId": "660e8400-e29b-41d4-a716-446655440001",
    "type": "expense",
    "description": "Aluguel Janeiro",
    "amount": 2500.00,
    "date": "2026-01-05",
    "status": "paid",
    "paymentDate": "2026-01-05T10:00:00Z"
  }'

# Transação parcelada no cartão
curl -X POST "http://localhost:3000/api/transactions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "categoryId": "880e8400-e29b-41d4-a716-446655440003",
    "type": "expense",
    "description": "TV Samsung 55\"",
    "amount": 333.33,
    "date": "2026-01-15",
    "status": "pending",
    "isInstallment": true,
    "installmentNumber": 1,
    "totalInstallments": 12,
    "creditCardId": "990e8400-e29b-41d4-a716-446655440004"
  }'
```

---

### 4. Atualizar Transação
**PUT** `/api/transactions/:id?companyId={companyId}`

Atualiza uma transação existente. Todos os campos são opcionais.

#### Path Parameters:
- `id` (string, obrigatório) - ID da transação

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Body (JSON):
```json
{
  "status": "paid",
  "paymentDate": "2026-01-20T15:00:00Z",
  "notes": "Pago via PIX"
}
```

#### Campos (todos opcionais):
- `categoryId` (string) - ID da categoria
- `type` (string) - Tipo: `income` ou `expense`
- `description` (string) - Descrição
- `amount` (number) - Valor
- `date` (string) - Data da transação
- `status` (string) - Status
- `paymentDate` (string) - Data do pagamento
- `isInstallment` (boolean) - Se é parcelado
- `installmentNumber` (number) - Número da parcela
- `totalInstallments` (number) - Total de parcelas
- `creditCardId` (string) - ID do cartão
- `notes` (string) - Observações

#### Respostas:

**200 OK**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "category_id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "expense",
  "description": "Aluguel Janeiro",
  "amount": 2500.00,
  "date": "2026-01-05",
  "status": "paid",
  "payment_date": "2026-01-20T15:00:00Z",
  "is_installment": false,
  "installment_number": null,
  "total_installments": null,
  "credit_card_id": null,
  "notes": "Pago via PIX",
  "created_at": "2026-01-05T10:00:00Z",
  "updated_at": "2026-01-20T15:30:00Z",
  "category": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Aluguel",
    "type": "expense",
    "color": "#EF4444"
  },
  "credit_card": null
}
```

**400 Bad Request**
```json
{
  "error": "Nenhum campo para atualizar"
}
```

**404 Not Found**
```json
{
  "error": "Transação não encontrada ou você não tem permissão"
}
```

#### Exemplo cURL:
```bash
curl -X PUT "http://localhost:3000/api/transactions/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "paymentDate": "2026-01-20T15:00:00Z"
  }'
```

---

### 5. Deletar Transação
**DELETE** `/api/transactions/:id?companyId={companyId}`

Deleta uma transação.

#### Path Parameters:
- `id` (string, obrigatório) - ID da transação

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK**
```json
{
  "message": "Transação deletada com sucesso"
}
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

#### Exemplo cURL:
```bash
curl -X DELETE "http://localhost:3000/api/transactions/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 6. Criar Transações em Lote
**POST** `/api/transactions/bulk`

Cria múltiplas transações de uma vez. Útil para criar todas as parcelas de uma compra parcelada.

#### Body (JSON):
```json
{
  "companyId": "123e4567-e89b-12d3-a456-426614174000",
  "transactions": [
    {
      "categoryId": "660e8400-e29b-41d4-a716-446655440001",
      "type": "expense",
      "description": "Notebook Dell - Parcela 1/12",
      "amount": 291.67,
      "date": "2026-01-15",
      "status": "pending",
      "isInstallment": true,
      "installmentNumber": 1,
      "totalInstallments": 12,
      "creditCardId": "990e8400-e29b-41d4-a716-446655440004"
    },
    {
      "categoryId": "660e8400-e29b-41d4-a716-446655440001",
      "type": "expense",
      "description": "Notebook Dell - Parcela 2/12",
      "amount": 291.67,
      "date": "2026-02-15",
      "status": "scheduled",
      "isInstallment": true,
      "installmentNumber": 2,
      "totalInstallments": 12,
      "creditCardId": "990e8400-e29b-41d4-a716-446655440004"
    }
  ]
}
```

#### Campos:
- `companyId` (string, obrigatório) - ID da empresa
- `transactions` (array, obrigatório) - Array de transações (máximo 100)

#### Validações:
- ✅ Deve ter pelo menos 1 transação
- ✅ Máximo de 100 transações por vez
- ✅ Empresa deve existir e pertencer ao usuário

#### Respostas:

**201 Created**
```json
[
  {
    "id": "bb0e8400-e29b-41d4-a716-446655440006",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "category_id": "660e8400-e29b-41d4-a716-446655440001",
    "type": "expense",
    "description": "Notebook Dell - Parcela 1/12",
    "amount": 291.67,
    "date": "2026-01-15",
    "status": "pending",
    "payment_date": null,
    "is_installment": true,
    "installment_number": 1,
    "total_installments": 12,
    "credit_card_id": "990e8400-e29b-41d4-a716-446655440004",
    "notes": null,
    "created_at": "2026-01-20T16:00:00Z",
    "updated_at": "2026-01-20T16:00:00Z",
    "category": { "id": "...", "name": "Equipamentos", "type": "expense", "color": "#8B5CF6" },
    "credit_card": { "id": "...", "name": "Nubank", "brand": "mastercard" }
  },
  {
    "id": "cc0e8400-e29b-41d4-a716-446655440007",
    "company_id": "123e4567-e89b-12d3-a456-426614174000",
    "category_id": "660e8400-e29b-41d4-a716-446655440001",
    "type": "expense",
    "description": "Notebook Dell - Parcela 2/12",
    "amount": 291.67,
    "date": "2026-02-15",
    "status": "scheduled",
    "payment_date": null,
    "is_installment": true,
    "installment_number": 2,
    "total_installments": 12,
    "credit_card_id": "990e8400-e29b-41d4-a716-446655440004",
    "notes": null,
    "created_at": "2026-01-20T16:00:00Z",
    "updated_at": "2026-01-20T16:00:00Z",
    "category": { "id": "...", "name": "Equipamentos", "type": "expense", "color": "#8B5CF6" },
    "credit_card": { "id": "...", "name": "Nubank", "brand": "mastercard" }
  }
]
```

**400 Bad Request**
```json
{
  "error": "Máximo de 100 transações por vez"
}
```

#### Exemplo cURL:
```bash
curl -X POST "http://localhost:3000/api/transactions/bulk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "transactions": [
      {
        "categoryId": "660e8400-e29b-41d4-a716-446655440001",
        "type": "expense",
        "description": "Parcela 1/3",
        "amount": 100.00,
        "date": "2026-01-15",
        "status": "pending",
        "isInstallment": true,
        "installmentNumber": 1,
        "totalInstallments": 3
      },
      {
        "categoryId": "660e8400-e29b-41d4-a716-446655440001",
        "type": "expense",
        "description": "Parcela 2/3",
        "amount": 100.00,
        "date": "2026-02-15",
        "status": "scheduled",
        "isInstallment": true,
        "installmentNumber": 2,
        "totalInstallments": 3
      }
    ]
  }'
```

---

### 7. Importar Transações em Lote
**POST** `/api/transactions/import`

Importa transações em lote a partir de planilha Excel. Permite criar múltiplas transações de uma vez, com criação automática de categorias se necessário.

#### Body (JSON):
```json
{
  "transactions": [
    {
      "description": "Pagamento fornecedor",
      "amount": 1500.50,
      "type": "expense",
      "category_name": "Fornecedores",
      "company_cnpj": "12.345.678/0001-90",
      "date": "2026-01-15",
      "status": "paid",
      "is_installment": false,
      "installment_number": null,
      "total_installments": null,
      "is_credit_card": true,
      "credit_card_name": "Visa Gold",
      "notes": "Pagamento parcela 1/3"
    },
    {
      "description": "Venda produto X",
      "amount": 5000.00,
      "type": "income",
      "category_name": "Vendas",
      "company_cnpj": "12.345.678/0001-90",
      "date": "2026-01-20",
      "status": "paid",
      "is_installment": true,
      "installment_number": 1,
      "total_installments": 12,
      "is_credit_card": false,
      "credit_card_name": null,
      "notes": null
    }
  ]
}
```

#### Campos do Array `transactions`:
- `description` (string, obrigatório) - Descrição da transação
- `amount` (number, obrigatório) - Valor da transação (sempre positivo)
- `type` (string, obrigatório) - Tipo: `"income"` ou `"expense"`
- `category_name` (string, obrigatório) - Nome da categoria (criar se não existir)
- `company_cnpj` (string, obrigatório) - CNPJ da empresa (formato: XX.XXX.XXX/XXXX-XX)
- `date` (string, obrigatório) - Data no formato ISO: `YYYY-MM-DD`
- `status` (string, obrigatório) - Status: `"paid"`, `"pending"` ou `"scheduled"`
- `is_installment` (boolean, obrigatório) - Se é parcelado
- `installment_number` (number, nullable) - Número da parcela (se `is_installment: true`)
- `total_installments` (number, nullable) - Total de parcelas (se `is_installment: true`)
- `is_credit_card` (boolean, obrigatório) - Se é transação de cartão de crédito
- `credit_card_name` (string, nullable) - Nome do cartão (se `is_credit_card: true`)
- `notes` (string, nullable) - Observações adicionais

#### Regras de Negócio:
- ✅ Máximo de 1000 transações por requisição
- ✅ CNPJ deve existir no banco de dados
- ✅ Usuário autenticado deve ter permissão para a empresa
- ✅ Se categoria não existir, criar automaticamente com cor padrão
- ✅ Se `is_credit_card: true`, buscar cartão pelo nome (case-insensitive)
- ✅ Se `is_installment: true`, validar `installment_number` ≤ `total_installments`
- ✅ CNPJ aceita com ou sem máscara (XX.XXX.XXX/XXXX-XX ou XXXXXXXXXXXXXX)
- ✅ Se alguma transação falhar, continuar processando as demais
- ✅ Retornar detalhes de cada erro no array `errors`

#### Respostas:

**200 OK - Importação bem-sucedida**
```json
{
  "success": true,
  "imported": 245,
  "failed": 5,
  "errors": [
    {
      "line": 3,
      "description": "Pagamento aluguel",
      "error": "Empresa com CNPJ 99.999.999/9999-99 não encontrada"
    },
    {
      "line": 15,
      "description": "Compra material",
      "error": "Cartão de crédito \"Visa Platinum\" não encontrado para a empresa ABC Ltda"
    }
  ],
  "categories_created": [
    {
      "name": "Fornecedores",
      "type": "expense",
      "company_id": "uuid-company-1"
    },
    {
      "name": "Vendas",
      "type": "income",
      "company_id": "uuid-company-1"
    }
  ]
}
```

**400 Bad Request - Dados inválidos**
```json
{
  "error": "Dados inválidos",
  "message": "Array de transações está vazio ou não foi fornecido"
}
```

```json
{
  "error": "Limite excedido",
  "message": "Máximo de 1000 transações por requisição"
}
```

**500 Internal Server Error**
```json
{
  "error": "Erro no servidor",
  "message": "Erro ao processar importação em lote"
}
```

#### Exemplo cURL:
```bash
curl -X POST "http://localhost:3000/api/transactions/import" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [
      {
        "description": "Pagamento fornecedor ABC",
        "amount": 1500.50,
        "type": "expense",
        "category_name": "Fornecedores",
        "company_cnpj": "12.345.678/0001-90",
        "date": "2026-01-15",
        "status": "paid",
        "is_installment": false,
        "installment_number": null,
        "total_installments": null,
        "is_credit_card": true,
        "credit_card_name": "Visa Gold",
        "notes": "Pagamento à vista"
      },
      {
        "description": "Venda produto X",
        "amount": 5000.00,
        "type": "income",
        "category_name": "Vendas",
        "company_cnpj": "12.345.678/0001-90",
        "date": "2026-01-20",
        "status": "paid",
        "is_installment": true,
        "installment_number": 1,
        "total_installments": 12,
        "is_credit_card": false,
        "credit_card_name": null,
        "notes": "Primeira parcela de 12"
      }
    ]
  }'
```

#### Observações:
- **Limite de requisição**: Máximo 1000 transações por chamada
- **Timeout**: Backend configurado para processar até 60 segundos
- **Cores das categorias**: Usa paleta padrão: `["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]`
- **Busca de cartão**: Case-insensitive e trim nos espaços
- **CNPJ**: Aceita com ou sem máscara (XX.XXX.XXX/XXXX-XX ou XXXXXXXXXXXXXX)
- **Cache**: Usa cache interno para empresas, categorias e cartões para melhorar performance

---


## Segurança

- ✅ Todas as rotas requerem autenticação JWT
- ✅ Row Level Security (RLS) garante isolamento
- ✅ Validação de propriedade da empresa
- ✅ Validação de categoria e cartão
- ✅ Validação de valores e datas
- ✅ Limite de 100 transações por bulk create
- ✅ Limite de 1000 transações por import
- ✅ Sanitização de inputs (trim)
- ✅ Criação automática de categorias no import
- ✅ Validação de CNPJ e permissões no import
