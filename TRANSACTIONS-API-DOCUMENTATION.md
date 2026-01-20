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

## Tipos TypeScript

```typescript
type TransactionType = 'income' | 'expense';
type TransactionStatus = 'paid' | 'pending' | 'scheduled';

interface Transaction {
  id: string;
  company_id: string;
  category_id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  status: TransactionStatus;
  payment_date: string | null; // ISO 8601
  is_installment: boolean;
  installment_number: number | null;
  total_installments: number | null;
  credit_card_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    type: TransactionType;
    color: string;
  };
  credit_card?: {
    id: string;
    name: string;
    brand: string;
  };
}
```

---

## Exemplo de Hook React Completo

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface TransactionFilters {
  filter?: 'income' | 'expense' | 'scheduled' | 'pending';
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryFilter?: string;
  statusFilter?: 'all' | 'paid' | 'pending' | 'scheduled' | 'overdue';
  from?: number;
  to?: number;
}

export const useTransactions = (companyId: string, filters?: TransactionFilters) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    const token = localStorage.getItem('access_token');
    setLoading(true);
    
    const params = new URLSearchParams({ companyId });
    if (filters?.filter) params.append('filter', filters.filter);
    if (filters?.searchQuery) params.append('searchQuery', filters.searchQuery);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.categoryFilter) params.append('categoryFilter', filters.categoryFilter);
    if (filters?.statusFilter) params.append('statusFilter', filters.statusFilter);
    if (filters?.from !== undefined) params.append('from', filters.from.toString());
    if (filters?.to !== undefined) params.append('to', filters.to.toString());
    
    try {
      const response = await axios.get(`/api/transactions?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setTransactions(response.data.data);
      setTotalCount(response.data.count);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar transações');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async (data: any) => {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await axios.post(
        '/api/transactions',
        { ...data, companyId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setTransactions([response.data, ...transactions]);
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const createBulkTransactions = async (transactionsData: any[]) => {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await axios.post(
        '/api/transactions/bulk',
        { companyId, transactions: transactionsData },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setTransactions([...response.data, ...transactions]);
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateTransaction = async (id: string, updates: any) => {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await axios.put(
        `/api/transactions/${id}?companyId=${companyId}`,
        updates,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setTransactions(transactions.map(t => 
        t.id === id ? response.data : t
      ));
      return response.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    const token = localStorage.getItem('access_token');
    
    try {
      await axios.delete(
        `/api/transactions/${id}?companyId=${companyId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchTransactions();
    }
  }, [companyId, filters]);

  return {
    transactions,
    totalCount,
    loading,
    error,
    refetch: fetchTransactions,
    createTransaction,
    createBulkTransactions,
    updateTransaction,
    deleteTransaction
  };
};

// Exemplo de uso com paginação
const MyComponent = () => {
  const [page, setPage] = useState(0);
  const pageSize = 50;
  
  const { transactions, totalCount, loading } = useTransactions('company-id', {
    from: page * pageSize,
    to: (page + 1) * pageSize - 1,
    statusFilter: 'overdue'
  });
  
  const totalPages = Math.ceil(totalCount / pageSize);
  
  return (
    <div>
      {transactions.map(t => (
        <div key={t.id}>{t.description}</div>
      ))}
      
      <div>
        Página {page + 1} de {totalPages} (Total: {totalCount} transações)
        <button onClick={() => setPage(p => p - 1)} disabled={page === 0}>
          Anterior
        </button>
        <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
          Próxima
        </button>
      </div>
    </div>
  );
};
```

---

## Utilitários para Parcelamento

```typescript
// Gera array de transações parceladas
export function generateInstallments(
  baseData: Omit<Transaction, 'id' | 'installmentNumber' | 'description'>,
  totalValue: number,
  totalInstallments: number,
  startDate: Date
): any[] {
  const installmentValue = totalValue / totalInstallments;
  
  return Array.from({ length: totalInstallments }, (_, index) => {
    const installmentDate = new Date(startDate);
    installmentDate.setMonth(installmentDate.getMonth() + index);
    
    return {
      ...baseData,
      description: `${baseData.description} - Parcela ${index + 1}/${totalInstallments}`,
      amount: Number(installmentValue.toFixed(2)),
      date: installmentDate.toISOString().split('T')[0],
      status: index === 0 ? 'pending' : 'scheduled',
      isInstallment: true,
      installmentNumber: index + 1,
      totalInstallments
    };
  });
}

// Uso:
const installments = generateInstallments(
  {
    companyId: '123',
    categoryId: '456',
    type: 'expense',
    creditCardId: '789'
  },
  3500, // valor total
  12,   // parcelas
  new Date('2026-01-15')
);

await createBulkTransactions(installments);
```

---

## Segurança

- ✅ Todas as rotas requerem autenticação JWT
- ✅ Row Level Security (RLS) garante isolamento
- ✅ Validação de propriedade da empresa
- ✅ Validação de categoria e cartão
- ✅ Validação de valores e datas
- ✅ Limite de 100 transações por bulk create
- ✅ Sanitização de inputs (trim)
