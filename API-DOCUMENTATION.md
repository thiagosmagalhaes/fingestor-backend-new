# API Documentation - Caixa Mestra Backend

## Base URL
```
http://localhost:3001
```

## Autenticação

Todos os endpoints do dashboard requerem autenticação via JWT do Supabase.

### Header de Autenticação
```http
Authorization: Bearer {seu_token_jwt}
```

Para obter o token:
1. Faça login no Supabase via frontend
2. Use `supabase.auth.getSession()` para obter o token
3. Envie o token no header `Authorization` de cada requisição

### Exemplo de Requisição Autenticada
```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

fetch('http://localhost:3001/api/dashboard/summary?companyId=uuid', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Erros de Autenticação

**401 Unauthorized - Token não fornecido:**
```json
{
  "error": "Unauthorized",
  "message": "Token de autenticação não fornecido"
}
```

**401 Unauthorized - Token inválido:**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

---

## Endpoints Disponíveis

### Health Check
```http
GET /health
```

Verifica se a API está online. **Não requer autenticação.**

**Response:**
```json
{
  "status": "ok",
  "message": "Caixa Mestra API is running"
}
```

---

## Dashboard Endpoints

🔒 **Todos os endpoints do dashboard requerem autenticação.**

Parâmetros necessários:
- `Authorization` header com Bearer token
- `companyId` na query string

### 1. Obter Todos os Dados do Dashboard
```http
GET /api/dashboard/all?companyId={uuid}
```

Retorna todos os dados do dashboard em uma única requisição (recomendado para performance).

**Response:**
```json
{
  "summary": {
    "balance": 5000.00,
    "totalIncome": 10000.00,
    "totalExpense": 5000.00,
    "pendingIncome": 2000.00,
    "pendingExpense": 1500.00
  },
  "overdue": {
    "count": 3,
    "total": 850.00
  },
  "cashFlow": [
    {
      "date": "2026-08",
      "income": 8000.00,
      "expense": 4500.00,
      "balance": 3500.00
    }
  ],
  "categoryBreakdown": [],
  "recentTransactions": [
    {
      "id": "uuid",
      "description": "Venda de produto",
      "amount": 1500.00,
      "type": "income",
      "status": "paid",
      "dueDate": "2026-01-15T00:00:00Z",
      "paidDate": "2026-01-15T10:30:00Z",
      "categoryName": "Vendas"
    }
  ],
  "creditCardInvoices": []
}
```

---

### 2. Resumo Financeiro do Mês
```http
GET /api/dashboard/summary?companyId={uuid}
```

Retorna o resumo financeiro do mês atual usando a função RPC `get_dashboard_summary`.

**Response:**
```json
{
  "balance": 5000.00,
  "totalIncome": 10000.00,
  "totalExpense": 5000.00,
  "pendingIncome": 2000.00,
  "pendingExpense": 1500.00
}
```

**Campos:**
- `balance`: Saldo do mês (receitas - despesas pagas)
- `totalIncome`: Total de receitas pagas no mês
- `totalExpense`: Total de despesas pagas no mês
- `pendingIncome`: Total de receitas pendentes no mês
- `pendingExpense`: Total de despesas pendentes no mês

---

### 3. Transações Vencidas
```http
GET /api/dashboard/overdue?companyId={uuid}
```

Retorna transações não pagas (`is_paid = false`) com data de vencimento anterior à data atual.

**Response:**
```json
{
  "count": 3,
  "total": 850.00
}
```

**Campos:**
- `count`: Quantidade de transações vencidas
- `total`: Valor total das transações vencidas

---

### 4. Fluxo de Caixa
```http
GET /api/dashboard/cash-flow?companyId={uuid}&months=6
```

Retorna dados de fluxo de caixa usando a função RPC `get_cash_flow_chart_data`.

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `months` (opcional): Quantidade de meses (padrão: 6)

**Response:**
```json
[
  {
    "date": "2025-08",
    "income": 8000.00,
    "expense": 4500.00,
    "balance": 3500.00
  },
  {
    "date": "2025-09",
    "income": 9500.00,
    "expense": 5200.00,
    "balance": 7800.00
  }
]
```

**Campos:**
- `date`: Mês no formato YYYY-MM
- `income`: Total de receitas pagas no mês
- `expense`: Total de despesas pagas no mês
- `balance`: Saldo acumulado até o mês

---

### 5. Breakdown por Categoria
```http
GET /api/dashboard/category-breakdown?companyId={uuid}
```

⚠️ **Pendente de implementação** - Atualmente retorna array vazio.

**Response:**
```json
[]
```

---

### 6. Transações Recentes
```http
GET /api/dashboard/recent-transactions?companyId={uuid}&limit=10
```

Retorna as transações mais recentes ordenadas por data de vencimento.

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `limit` (opcional): Quantidade de transações (padrão: 10)

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "description": "Venda de produto",
    "amount": 1500.00,
    "type": "income",
    "status": "paid",
    "dueDate": "2026-01-15T00:00:00.000Z",
    "paidDate": "2026-01-15T10:30:00.000Z",
    "categoryName": "Vendas"
  },
  {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "description": "Aluguel",
    "amount": 2000.00,
    "type": "expense",
    "status": "pending",
    "dueDate": "2026-01-20T00:00:00.000Z",
    "paidDate": null,
    "categoryName": "Despesas Fixas"
  }
]
```

**Campos:**
- `id`: UUID da transação
- `description`: Descrição da transação
- `amount`: Valor
- `type`: Tipo (`income` ou `expense`)
- `status`: Status (`paid`, `pending` ou `overdue`)
- `dueDate`: Data de vencimento (ISO 8601)
- `paidDate`: Data de pagamento (ISO 8601, pode ser null)
- `categoryName`: Nome da categoria (pode ser null)

---

### 7. Faturas de Cartão de Crédito
```http
GET /api/dashboard/credit-card-invoices?companyId={uuid}
```

⚠️ **Pendente de implementação** - Atualmente retorna array vazio.

**Response:**
```json
[]
```

---

## Estrutura do Banco de Dados

### Tabelas Principais

- **companies**: Empresas
- **categories**: Categorias de receitas e despesas
- **credit_cards**: Cartões de crédito
- **transactions**: Transações financeiras

### Funções RPC do Supabase

#### get_dashboard_summary
```sql
get_dashboard_summary(
  p_company_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS JSON
```

Retorna resumo financeiro consolidado de um período específico.

#### get_cash_flow_chart_data
```sql
get_cash_flow_chart_data(
  p_company_id UUID,
  p_months INTEGER DEFAULT 6
) RETURNS TABLE (
  month TEXT,
  income DECIMAL(12,2),
  expense DECIMAL(12,2),
  balance DECIMAL(12,2)
)
```

Retorna dados de fluxo de caixa para os últimos N meses.

---

## Códigos de Erro

### 400 Bad Request
```json
{
  "error": "companyId é obrigatório"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Route /api/unknown not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Erro ao buscar resumo do dashboard"
}
```

---

## Testando a API

### Usando cURL

```bash
# Health check (sem autenticação)
curl http://localhost:3001/health

# Resumo do dashboard (com autenticação)
curl "http://localhost:3001/api/dashboard/summary?companyId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Todos os dados (com autenticação)
curl "http://localhost:3001/api/dashboard/all?companyId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Usando Postman ou Insomnia

1. Importe a coleção ou crie manualmente as requisições
2. Defina a base URL: `http://localhost:3001`
3. **Configure autenticação:**
   - Type: `Bearer Token`
   - Token: Obtenha do Supabase após login
4. Adicione o parâmetro `companyId` em cada requisição

### Obtendo Token de Teste
x] Adicionar autenticação JWT com Supabase
- [ ] Adicionar autorização por empresa (verificar se usuário tem acesso)
- [ ] Implementar CRUD de transações
- [ ] Implementar CRUD de categorias
- [ ] Implementar CRUD de cartões de crédito
- [ ] Adicionar validação de dados com Zod
- [ ] Implementar paginação
- [ ] Adicionar testes automatizados
- [ ] Rate limiting
- [ ] Logging estruturado
});

// Obter token
const token = data.session?.access_token;
console.log('Token:', token);
```

---

## Próximos Passos

- [ ] Implementar `getCategoryBreakdown()`
- [ ] Implementar `getCreditCardInvoices()`
- [ ] Adicionar autenticação JWT
- [ ] Implementar CRUD de transações
- [ ] Implementar CRUD de categorias
- [ ] Implementar CRUD de cartões de crédito
- [ ] Adicionar validação de dados com Zod
- [ ] Implementar paginação
- [ ] Adicionar testes automatizados
