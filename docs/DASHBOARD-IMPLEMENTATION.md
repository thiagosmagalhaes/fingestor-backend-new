# Dashboard API - Guia de Implementação Frontend

## Autenticação

Todas as requisições requerem um token JWT do Supabase no header `Authorization`.

```bash
Authorization: Bearer {seu_token_jwt_aqui}
```

## Endpoints do Dashboard

### 1. Status de Configuração Inicial (Onboarding)

**Endpoint:** `GET /api/dashboard/setup-status`

Retorna o status de configuração inicial do sistema, verificando se o usuário já possui pelo menos um registro em cada feature essencial. Endpoint otimizado que busca apenas 1 registro de cada tabela. **Não requer companyId** - verifica automaticamente se o usuário tem uma company cadastrada.

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3001/api/dashboard/setup-status" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Parâmetros:**
- Nenhum parâmetro necessário (usa token de autenticação)

**Resposta de sucesso - usuário completamente novo (200 OK):**
```json
{
  "hasCompany": false,
  "hasCategories": false,
  "hasCreditCards": false,
  "hasTransactions": false
}
```

**Resposta de sucesso - usuário com company mas sem configurações (200 OK):**
```json
{
  "hasCompany": true,
  "hasCategories": false,
  "hasCreditCards": false,
  "hasTransactions": false
}
```

**Resposta de sucesso - configuração parcial (200 OK):**
```json
{
  "hasCompany": true,
  "hasCategories": true,
  "hasCreditCards": false,
  "hasTransactions": true
}
```

**Resposta de sucesso - configuração completa (200 OK):**
```json
{
  "hasCompany": true,
  "hasCategories": true,
  "hasCreditCards": true,
  "hasTransactions": true
}
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar status de configuração"
}
```

**Campos da resposta:**
- `hasCompany` - Indica se existe pelo menos 1 empresa cadastrada (primeira etapa do onboarding)
- `hasCategories` - Indica se existe pelo menos 1 categoria cadastrada
- `hasCreditCards` - Indica se existe pelo menos 1 cartão de crédito cadastrado
- `hasTransactions` - Indica se existe pelo menos 1 transação cadastrada

**Uso no frontend (Onboarding Card):**
```typescript
const { data: setupStatus } = await fetch(
  `${API_URL}/api/dashboard/setup-status`,
  { headers: { Authorization: `Bearer ${token}` } }
).then(r => r.json());

// Exibir card de onboarding apenas se alguma etapa não está completa
const showOnboarding = !setupStatus.hasCompany || 
                       !setupStatus.hasCategories || 
                       !setupStatus.hasCreditCards || 
                       !setupStatus.hasTransactions;

// Calcular progresso (4 etapas no total)
const completedSteps = [
  setupStatus.hasCompany,
  setupStatus.hasCategories,
  setupStatus.hasCreditCards,
  setupStatus.hasTransactions
].filter(Boolean).length;

const progress = `${completedSteps}/4`;
```

**Quando usar:** 
- No carregamento inicial do dashboard para exibir/ocultar o card de onboarding
- Periodicamente para atualizar o progresso do usuário
- Após o usuário completar alguma ação (cadastro de categoria, cartão, etc.)

---

### 2. Obter Todos os Dados do Dashboard (Recomendado)

**Endpoint:** `GET /api/dashboard/all`

Use este endpoint para obter todos os dados do dashboard em uma única requisição. Este endpoint combina as respostas de todos os outros endpoints.

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3001/api/dashboard/all?companyId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta de sucesso (200 OK):**
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
    },
    {
      "date": "2025-10",
      "income": 10000.00,
      "expense": 5000.00,
      "balance": 12800.00
    },
    {
      "date": "2025-11",
      "income": 11200.00,
      "expense": 6100.00,
      "balance": 17900.00
    },
    {
      "date": "2025-12",
      "income": 12000.00,
      "expense": 6500.00,
      "balance": 23400.00
    },
    {
      "date": "2026-01",
      "income": 10500.00,
      "expense": 5500.00,
      "balance": 28400.00
    }
  ],
  "categoryBreakdown": [
    {
      "name": "Salários",
      "value": 3000.00,
      "color": "#FF6384",
      "percentage": 54.55,
      "transactionCount": 5
    },
    {
      "name": "Aluguel",
      "value": 1500.00,
      "color": "#36A2EB",
      "percentage": 27.27,
      "transactionCount": 1
    },
    {
      "name": "Utilidades",
      "value": 800.00,
      "color": "#FFCE56",
      "percentage": 14.55,
      "transactionCount": 8
    },
    {
      "name": "Marketing",
      "value": 200.00,
      "color": "#4BC0C0",
      "percentage": 3.63,
      "transactionCount": 2
    }
  ],
  "recentTransactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "description": "Venda de produto",
      "amount": 1500.00,
      "type": "income",
      "status": "paid",
      "dueDate": "2026-01-15T00:00:00.000Z",
      "paidDate": "2026-01-15T10:30:00.000Z",
      "categoryName": "Vendas",
      "categoryColor": "#4CAF50"
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "description": "Aluguel",
      "amount": 2000.00,
      "type": "expense",
      "status": "pending",
      "dueDate": "2026-01-20T00:00:00.000Z",
      "categoryName": "Despesas Fixas",
      "categoryColor": "#36A2EB"
    },
    {
      "id": "750e8400-e29b-41d4-a716-446655440002",
      "description": "Conta de luz",
      "amount": 350.00,
      "type": "expense",
      "status": "overdue",
      "dueDate": "2026-01-10T00:00:00.000Z",
      "categoryName": "Utilidades",
      "categoryColor": "#FFCE56"
    }
  ],
  "creditCardInvoices": []
}
```

**Resposta de erro - companyId ausente (400 Bad Request):**
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de erro - não autorizado (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar dados do dashboard"
}
```

**O que usar:**
- `summary.balance` - Saldo do mês para o card "Saldo do Mês"
- `summary.totalIncome` - Total de receitas pagas para o card "Receitas"
- `summary.totalExpense` - Total de despesas pagas para o card "Despesas"
- `summary.pendingIncome` - Subtitle do card "Receitas" (ex: "R$ 2.000,00 pendente")
- `summary.pendingExpense` - Subtitle do card "Despesas" (ex: "R$ 1.500,00 pendente")
- `overdue.count` - Número de transações vencidas para o card "Transações Vencidas"
- `overdue.total` - Valor total vencido (ex: "R$ 850,00 em atraso")
- `cashFlow[]` - Array de dados para o gráfico de fluxo de caixa (CashFlowChart)
- `recentTransactions[]` - Array de transações para a lista de transações recentes
- `categoryBreakdown[]` - Array para o breakdown por categoria (gráfico de pizza/donut)
- `creditCardInvoices[]` - Array de faturas de cartão (pendente)

---

### 3. Resumo Financeiro do Mês

**Endpoint:** `GET /api/dashboard/summary`

Retorna apenas o resumo financeiro do mês atual usando a função RPC `get_dashboard_summary`.

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3001/api/dashboard/summary?companyId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta de sucesso (200 OK):**
```json
{
  "balance": 5000.00,
  "totalIncome": 10000.00,
  "totalExpense": 5000.00,
  "pendingIncome": 2000.00,
  "pendingExpense": 1500.00
}
```

**Resposta de erro - companyId ausente (400 Bad Request):**
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar resumo do dashboard"
}
```

**Quando usar:** Quando você só precisa atualizar os cards de resumo financeiro.

---

### 4. Transações Vencidas

**Endpoint:** `GET /api/dashboard/overdue`

Retorna quantidade e valor total de transações vencidas (status pending/scheduled com data anterior a hoje).

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3001/api/dashboard/overdue?companyId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta de sucesso (200 OK):**
```json
{
  "count": 3,
  "total": 850.00
}
```

**Resposta quando não há transações vencidas (200 OK):**
```json
{
  "count": 0,
  "total": 0
}
```

**Resposta de erro - companyId ausente (400 Bad Request):**
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar transações vencidas"
}
```

**O que usar:**
- `count` - Valor principal do card "Transações Vencidas"
- `total` - Subtitle (ex: "R$ 850,00 em atraso")

---

### 5. Fluxo de Caixa

**Endpoint:** `GET /api/dashboard/cash-flow`

Retorna dados de fluxo de caixa para montar o gráfico usando a função RPC `get_cash_flow_chart_data`. Por padrão retorna 6 meses.

**Exemplo de requisição (6 meses):**
```bash
curl -X GET "http://localhost:3001/api/dashboard/cash-flow?companyId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Exemplo de requisição (12 meses):**
```bash
curl -X GET "http://localhost:3001/api/dashboard/cash-flow?companyId=550e8400-e29b-41d4-a716-446655440000&months=12" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Parâmetros:**
- `companyId` (obrigatório) - UUID da empresa
- `months` (opcional) - Quantidade de meses, padrão: 6

**Resposta de sucesso (200 OK):**
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
  },
  {
    "date": "2025-10",
    "income": 10000.00,
    "expense": 5000.00,
    "balance": 12800.00
  },
  {
    "date": "2025-11",
    "income": 11200.00,
    "expense": 6100.00,
    "balance": 17900.00
  },
  {
    "date": "2025-12",
    "income": 12000.00,
    "expense": 6500.00,
    "balance": 23400.00
  },
  {
    "date": "2026-01",
    "income": 10500.00,
    "expense": 5500.00,
    "balance": 28400.00
  }
]
```

**Resposta quando não há dados (200 OK):**
```json
[]
```

**Resposta de erro - companyId ausente (400 Bad Request):**
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar fluxo de caixa"
}
```

**Como usar no gráfico:**
- `date` - Label do eixo X (formato: YYYY-MM)
- `income` - Linha verde de receitas
- `expense` - Linha vermelha de despesas
- `balance` - Linha azul de saldo acumulado

**Exemplo de implementação:**
```typescript
const labels = cashFlow.map(item => item.date);
const incomeData = cashFlow.map(item => item.income);
const expenseData = cashFlow.map(item => item.expense);
const balanceData = cashFlow.map(item => item.balance);
```

---

### 6. Transações Recentes

**Endpoint:** `GET /api/dashboard/recent-transactions`

Retorna as transações mais recentes do mês atual ordenadas por data de vencimento decrescente.

**Exemplo de requisição (10 transações):**
```bash
curl -X GET "http://localhost:3001/api/dashboard/recent-transactions?companyId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Exemplo de requisição (20 transações):**
```bash
curl -X GET "http://localhost:3001/api/dashboard/recent-transactions?companyId=550e8400-e29b-41d4-a716-446655440000&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Parâmetros:**
- `companyId` (obrigatório) - UUID da empresa
- `limit` (opcional) - Quantidade de transações, padrão: 10

**Resposta de sucesso (200 OK):**
```json
**Resposta de sucesso (200 OK):**
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
    "categoryName": "Vendas",
    "categoryColor": "#4CAF50"
  },
  {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "description": "Aluguel",
    "amount": 2000.00,
    "type": "expense",
    "status": "pending",
    "dueDate": "2026-01-20T00:00:00.000Z",
    "paidDate": null,
    "categoryName": "Despesas Fixas",
    "categoryColor": "#36A2EB"
  },
  {
    "id": "750e8400-e29b-41d4-a716-446655440002",
    "description": "Conta de luz",
    "amount": 350.00,
    "type": "expense",
    "status": "overdue",
    "dueDate": "2026-01-10T00:00:00.000Z",
    "paidDate": null,
    "categoryName": "Utilidades",
    "categoryColor": "#FFCE56"
  },
  {
    "id": "850e8400-e29b-41d4-a716-446655440003",
    "description": "Salário funcionário",
    "amount": 3500.00,
    "type": "expense",
    "status": "paid",
    "dueDate": "2026-01-05T00:00:00.000Z",
    "paidDate": "2026-01-05T08:00:00.000Z",
    "categoryName": "Salários",
    "categoryColor": "#FF6384"
  }
]
```

**Resposta quando não há transações (200 OK):**
```json
[]
```

**Resposta de erro - companyId ausente (400 Bad Request):**
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar transações recentes"
}
```

**Campos:**
- `type` - Tipo da transação: `"income"` (receita) ou `"expense"` (despesa)
- `status` - Status: `"paid"` (pago), `"pending"` (pendente), `"overdue"` (vencido)
- `dueDate` - Data de vencimento (ISO 8601)
- `paidDate` - Data de pagamento (ISO 8601, pode ser null)
- `categoryName` - Nome da categoria (pode ser null/undefined)
- `categoryColor` - Cor da categoria em hex (pode ser null/undefined)

**Exemplo de uso:**
```typescript
transactions.map(t => (
  <TransactionItem
    key={t.id}
    description={t.description}
    amount={t.amount}
    type={t.type}
    status={t.status}
    date={new Date(t.dueDate)}
    category={t.categoryName}
    color={t.categoryColor}
  />
))
```

---

### 7. Breakdown por Categoria

**Endpoint:** `GET /api/dashboard/category-breakdown`

Retorna o breakdown de despesas por categoria do mês atual, agrupando as transações e calculando percentuais. Mostra as top 5 categorias e agrupa o resto em "Outros".

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3001/api/dashboard/category-breakdown?companyId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta de sucesso com dados (200 OK):**
```json
[
  {
    "name": "Salários",
    "value": 3000.00,
    "color": "#FF6384",
    "percentage": 54.55,
    "transactionCount": 5
  },
  {
    "name": "Aluguel",
    "value": 1500.00,
    "color": "#36A2EB",
    "percentage": 27.27,
    "transactionCount": 1
  },
  {
    "name": "Utilidades",
    "value": 800.00,
    "color": "#FFCE56",
    "percentage": 14.55,
    "transactionCount": 8
  },
  {
    "name": "Marketing",
    "value": 200.00,
    "color": "#4BC0C0",
    "percentage": 3.63,
    "transactionCount": 2
  }
]
```

**Resposta de sucesso com mais de 5 categorias (200 OK):**
```json
[
  {
    "name": "Salários",
    "value": 5000.00,
    "color": "#FF6384",
    "percentage": 50.00,
    "transactionCount": 5
  },
  {
    "name": "Aluguel",
    "value": 2000.00,
    "color": "#36A2EB",
    "percentage": 20.00,
    "transactionCount": 1
  },
  {
    "name": "Utilidades",
    "value": 1500.00,
    "color": "#FFCE56",
    "percentage": 15.00,
    "transactionCount": 8
  },
  {
    "name": "Marketing",
    "value": 800.00,
    "color": "#4BC0C0",
    "percentage": 8.00,
    "transactionCount": 3
  },
  {
    "name": "Transporte",
    "value": 400.00,
    "color": "#9966FF",
    "percentage": 4.00,
    "transactionCount": 6
  },
  {
    "name": "Outros",
    "value": 300.00,
    "color": "#CCCCCC",
    "percentage": 3.00,
    "transactionCount": 4
  }
]
```

**Resposta quando não há despesas no mês (200 OK):**
```json
[]
```

**Resposta de erro - companyId ausente (400 Bad Request):**
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar breakdown de categorias"
}
```

**Campos:**
- `name` - Nome da categoria (ou "Outros" para categorias agrupadas)
- `value` - Valor total das despesas nesta categoria
- `color` - Cor em hexadecimal para usar no gráfico
- `percentage` - Percentual do total de despesas (0-100)
- `transactionCount` - Número de transações nesta categoria

**Exemplo de uso em gráfico de pizza/donut:**
```typescript
const chartData = {
  labels: breakdown.map(item => item.name),
  datasets: [{
    data: breakdown.map(item => item.value),
    backgroundColor: breakdown.map(item => item.color),
  }]
};
```

---

### 8. Faturas de Cartão de Crédito

**Endpoint:** `GET /api/dashboard/credit-card-invoices`

Retorna faturas de cartões de crédito. **Nota:** Endpoint implementado mas ainda retorna array vazio (funcionalidade em desenvolvimento).

**Exemplo de requisição:**
```bash
curl -X GET "http://localhost:3001/api/dashboard/credit-card-invoices?companyId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta atual (200 OK):**
```json
[]
```

**Resposta futura esperada (quando implementado):**
```json
[
  {
    "id": "invoice-uuid-1",
    "creditCardId": "card-uuid-1",
    "creditCardName": "Nubank",
    "dueDate": "2026-02-10",
    "closingDate": "2026-01-25",
    "totalAmount": 2500.00,
    "status": "open",
    "transactionCount": 12
  },
  {
    "id": "invoice-uuid-2",
    "creditCardId": "card-uuid-2",
    "creditCardName": "Inter",
    "dueDate": "2026-02-15",
    "closingDate": "2026-01-30",
    "totalAmount": 1800.00,
    "status": "open",
    "transactionCount": 8
  }
]
```

**Resposta de erro - companyId ausente (400 Bad Request):**
```json
{
  "error": "companyId é obrigatório"
}
```

**Resposta de erro - token inválido (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Resposta de erro - erro no servidor (500 Internal Server Error):**
```json
{
  "error": "Erro ao buscar faturas de cartão"
}

---

## Implementação no Frontend React

### 1. Obter o Token de Autenticação

```typescript
import { supabase } from './lib/supabase';

// Após login
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### 2. Criar Hook Customizado

```typescript
// hooks/useDashboard.ts
import { useState, useEffect } from 'react';

export function useDashboard(companyId: string | null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;

    async function fetchDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(
          `http://localhost:3001/api/dashboard/all?companyId=${companyId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch dashboard');

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [companyId]);

  return { data, loading, error };
}
```

### 3. Usar no Componente

```typescript
// pages/Dashboard.tsx
export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const { data, loading, error } = useDashboard(selectedCompany?.id);

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <div>
      {/* Cards de Resumo */}
      <StatCard
        title="Saldo do Mês"
        value={formatCurrency(data.summary.balance)}
        variant={data.summary.balance >= 0 ? 'income' : 'expense'}
      />
      
      <StatCard
        title="Receitas"
        value={formatCurrency(data.summary.totalIncome)}
        subtitle={`${formatCurrency(data.summary.pendingIncome)} pendente`}
        variant="income"
      />
      
      {/* Gráfico de Fluxo de Caixa */}
      <CashFlowChart data={data.cashFlow} />
      
      {/* Transações Recentes */}
      <RecentTransactions transactions={data.recentTransactions} />
    </div>
  );
}
```

---

## Códigos de Status HTTP

| Código | Significado | Quando ocorre |
|--------|-------------|---------------|
| 200 | OK | Requisição bem-sucedida |
| 400 | Bad Request | Parâmetro `companyId` ausente ou inválido |
| 401 | Unauthorized | Token JWT inválido, expirado ou ausente |
| 500 | Internal Server Error | Erro no servidor ou banco de dados |

## Tratamento de Erros

### 401 Unauthorized

**Exemplo de requisição sem token:**
```bash
curl -X GET "http://localhost:3001/api/dashboard/summary?companyId=550e8400-e29b-41d4-a716-446655440000"
```

**Resposta:**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

**Ação:** Redirecionar para login e renovar sessão do Supabase.

### 400 Bad Request

**Exemplo de requisição sem companyId:**
```bash
curl -X GET "http://localhost:3001/api/dashboard/summary" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta:**
```json
{
  "error": "companyId é obrigatório"
}
```

**Ação:** Verificar se `companyId` está sendo enviado corretamente na query string.

### 500 Internal Server Error

**Resposta:**
```json
{
  "error": "Erro ao buscar resumo do dashboard"
}
```

**Ação:** Verificar logs do servidor e conexão com Supabase. Pode indicar:
- Problemas de conexão com o banco de dados
- Erros nas funções RPC
- Problemas de permissão (RLS)

---

## Variáveis de Ambiente (Frontend)

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://imijwgljspsumnwmnedw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Exemplos Completos de Requisições

### Usando fetch no JavaScript/TypeScript

```typescript
// Obter token do Supabase
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Fazer requisição
const response = await fetch(
  `${import.meta.env.VITE_API_URL}/api/dashboard/all?companyId=${companyId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();
console.log(data);
```

### Usando axios

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptor para adicionar token automaticamente
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Fazer requisição
const { data } = await apiClient.get('/api/dashboard/all', {
  params: { companyId }
});
```

### Usando React Query (TanStack Query)

```typescript
import { useQuery } from '@tanstack/react-query';

function useDashboard(companyId: string | null) {
  return useQuery({
    queryKey: ['dashboard', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('companyId is required');
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dashboard/all?companyId=${companyId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard');
      }

      return response.json();
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Uso no componente
const { data, isLoading, error, refetch } = useDashboard(selectedCompany?.id);
```

---

## Dicas de Performance

1. **Use `/api/dashboard/all`** para carregar tudo de uma vez em vez de múltiplas requisições
2. **Implemente cache** com React Query ou SWR para evitar requisições desnecessárias
3. **Adicione refresh manual** com botão ou **polling automático** (ex: a cada 5 minutos)
4. **Use Loading Skeletons** enquanto os dados carregam para melhor UX
5. **Implemente retry logic** para falhas de rede temporárias
6. **Adicione debounce** se permitir filtros em tempo real

**Exemplo de polling com React Query:**
```typescript
useQuery({
  queryKey: ['dashboard', companyId],
  queryFn: fetchDashboard,
  refetchInterval: 5 * 60 * 1000, // 5 minutos
  refetchIntervalInBackground: false,
});
```

---

## Testando os Endpoints

### Coleção Postman/Insomnia

Crie uma coleção com as seguintes variáveis:
- `{{baseUrl}}`: `http://localhost:3001`
- `{{token}}`: Seu token JWT do Supabase
- `{{companyId}}`: UUID da empresa de teste

### Exemplo com Thunder Client (VS Code)

```json
{
  "name": "Get Dashboard All",
  "method": "GET",
  "url": "{{baseUrl}}/api/dashboard/all",
  "headers": {
    "Authorization": "Bearer {{token}}"
  },
  "params": {
    "companyId": "{{companyId}}"
  }
}
```

---

## Próximos Passos

- [x] Implementar endpoint `/all` para buscar todos os dados
- [x] Implementar `summary` com RPC
- [x] Implementar `overdue` 
- [x] Implementar `cash-flow` com RPC
- [x] Implementar `category-breakdown` com agregação
- [x] Implementar `recent-transactions`
- [ ] Implementar `credit-card-invoices` completo
- [ ] Adicionar WebSocket para updates em tempo real
- [ ] Implementar filtros de data customizados no dashboard
- [ ] Adicionar exportação de relatórios (PDF/Excel)
- [ ] Adicionar endpoint para comparação entre períodos
