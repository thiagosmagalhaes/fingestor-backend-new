# Transaction Query Functions for LLM

Este documento contém exemplos de uso das funções RPC para consulta de transações, otimizadas para uso por LLM.

Todas as funções retornam dados agregados para evitar sobrecarga de informação e facilitam análises e insights.

---

## 1. get_transactions_by_period

Retorna transações agregadas por período (dia, semana ou mês).

### Parâmetros
- `p_company_id` (UUID) - ID da empresa
- `p_start_date` (DATE) - Data inicial
- `p_end_date` (DATE) - Data final
- `p_period_type` (TEXT) - Tipo de período: 'day', 'week' ou 'month' (default: 'day')

### Exemplo de chamada

```sql
-- Agrupado por dia
SELECT * FROM get_transactions_by_period(
  'your-company-uuid',
  '2026-01-01',
  '2026-01-31',
  'day'
);

-- Agrupado por semana
SELECT * FROM get_transactions_by_period(
  'your-company-uuid',
  '2025-12-01',
  '2026-01-31',
  'week'
);

-- Agrupado por mês
SELECT * FROM get_transactions_by_period(
  'your-company-uuid',
  '2025-01-01',
  '2025-12-31',
  'month'
);
```

### Exemplo via JavaScript (Supabase Client)

```javascript
const { data, error } = await supabase
  .rpc('get_transactions_by_period', {
    p_company_id: companyId,
    p_start_date: '2026-01-01',
    p_end_date: '2026-01-31',
    p_period_type: 'week'
  });
```

### Retorno esperado

```json
[
  {
    "period_start": "2026-01-01",
    "period_end": "2026-01-07",
    "total_income": 15000.00,
    "total_expenses": 8500.00,
    "net_amount": 6500.00,
    "income_count": 12,
    "expense_count": 25,
    "total_count": 37
  }
]
```

---

## 2. get_transactions_by_category

Retorna transações agrupadas por categoria com percentuais do total.

### Parâmetros
- `p_company_id` (UUID) - ID da empresa
- `p_start_date` (DATE) - Data inicial
- `p_end_date` (DATE) - Data final
- `p_type` (TEXT) - Filtro por tipo: 'income', 'expense' ou 'ambos' para ambos (default: 'ambos')
- `p_limit` (INTEGER) - Limite de resultados (default: 20)

### Exemplo de chamada

```sql
-- Todas as categorias (receitas e despesas)
SELECT * FROM get_transactions_by_category(
  'your-company-uuid',
  '2026-01-01',
  '2026-01-31',
  'ambos',
  20
);

-- Apenas despesas
SELECT * FROM get_transactions_by_category(
  'your-company-uuid',
  '2026-01-01',
  '2026-01-31',
  'expense',
  10
);

-- Apenas receitas
SELECT * FROM get_transactions_by_category(
  'your-company-uuid',
  '2026-01-01',
  '2026-01-31',
  'income',
  10
);
```

### Exemplo via JavaScript (Supabase Client)

```javascript
const { data, error } = await supabase
  .rpc('get_transactions_by_category', {
    p_company_id: companyId,
    p_start_date: '2026-01-01',
    p_end_date: '2026-01-31',
    p_type: 'expense',
    p_limit: 10
  });
```

### Retorno esperado

```json
[
  {
    "category_id": "cat-uuid-1",
    "category_name": "Alimentação",
    "category_color": "#FF5733",
    "transaction_type": "expense",
    "total_amount": 3500.00,
    "transaction_count": 45,
    "avg_amount": 77.78,
    "percentage_of_total": 35.50
  }
]
```

---

## 3. get_transactions_statistics

Retorna estatísticas e métricas chave das transações.

### Parâmetros
- `p_company_id` (UUID) - ID da empresa
- `p_start_date` (DATE) - Data inicial
- `p_end_date` (DATE) - Data final

### Exemplo de chamada

```sql
SELECT * FROM get_transactions_statistics(
  'your-company-uuid',
  '2026-01-01',
  '2026-01-31'
);
```

### Exemplo via JavaScript (Supabase Client)

```javascript
const { data, error } = await supabase
  .rpc('get_transactions_statistics', {
    p_company_id: companyId,
    p_start_date: '2026-01-01',
    p_end_date: '2026-01-31'
  });
```

### Retorno esperado

```json
[
  {
    "metric_name": "total_income",
    "metric_value": 45000.00,
    "metric_description": "Total de receitas no período"
  },
  {
    "metric_name": "total_expenses",
    "metric_value": 28500.00,
    "metric_description": "Total de despesas no período"
  },
  {
    "metric_name": "net_balance",
    "metric_value": 16500.00,
    "metric_description": "Saldo líquido (receitas - despesas)"
  },
  {
    "metric_name": "avg_income",
    "metric_value": 2250.00,
    "metric_description": "Média de valor por receita"
  },
  {
    "metric_name": "avg_expense",
    "metric_value": 380.00,
    "metric_description": "Média de valor por despesa"
  }
]
```

---

## 4. get_top_transactions

Retorna as maiores transações do período (top N por valor).

### Parâmetros
- `p_company_id` (UUID) - ID da empresa
- `p_start_date` (DATE) - Data inicial
- `p_end_date` (DATE) - Data final
- `p_type` (transaction_type) - Filtro por tipo: 'income', 'expense' ou NULL para ambos (default: NULL)
- `p_limit` (INTEGER) - Quantidade de resultados (default: 10)

### Exemplo de chamada

```sql
-- Top 10 maiores transações (todas)
SELECT * FROM get_top_transactions(
  'your-company-uuid',
  '2026-01-01',
  '2026-01-31',
  NULL,
  10
);

-- Top 5 maiores despesas
SELECT * FROM get_top_transactions(
  'your-company-uuid',
  '2026-01-01',
  '2026-01-31',
  'expense',
  5
);

-- Top 5 maiores receitas
SELECT * FROM get_top_transactions(
  'your-company-uuid',
  '2026-01-01',
  '2026-01-31',
  'income',
  5
);
```

### Exemplo via JavaScript (Supabase Client)

```javascript
const { data, error } = await supabase
  .rpc('get_top_transactions', {
    p_company_id: companyId,
    p_start_date: '2026-01-01',
    p_end_date: '2026-01-31',
    p_type: 'expense',
    p_limit: 5
  });
```

### Retorno esperado

```json
[
  {
    "id": "transaction-uuid-1",
    "date": "2026-01-15",
    "type": "expense",
    "description": "Pagamento de fornecedor",
    "amount": 5000.00,
    "category_name": "Fornecedores",
    "status": "paid",
    "is_installment": false,
    "is_credit_card": false
  }
]
```

---

## 5. compare_transaction_periods

Compara dois períodos e mostra diferenças, percentuais e tendências.

### Parâmetros
- `p_company_id` (UUID) - ID da empresa
- `p_period1_start` (DATE) - Data inicial do período 1
- `p_period1_end` (DATE) - Data final do período 1
- `p_period2_start` (DATE) - Data inicial do período 2
- `p_period2_end` (DATE) - Data final do período 2

### Exemplo de chamada

```sql
-- Comparar janeiro de 2025 com janeiro de 2026
SELECT * FROM compare_transaction_periods(
  'your-company-uuid',
  '2025-01-01',
  '2025-01-31',
  '2026-01-01',
  '2026-01-31'
);

-- Comparar dezembro com janeiro
SELECT * FROM compare_transaction_periods(
  'your-company-uuid',
  '2025-12-01',
  '2025-12-31',
  '2026-01-01',
  '2026-01-31'
);
```

### Exemplo via JavaScript (Supabase Client)

```javascript
const { data, error } = await supabase
  .rpc('compare_transaction_periods', {
    p_company_id: companyId,
    p_period1_start: '2025-01-01',
    p_period1_end: '2025-01-31',
    p_period2_start: '2026-01-01',
    p_period2_end: '2026-01-31'
  });
```

### Retorno esperado

```json
[
  {
    "metric": "total_income",
    "period1_value": 35000.00,
    "period2_value": 45000.00,
    "difference": 10000.00,
    "percentage_change": 28.57,
    "trend": "up"
  },
  {
    "metric": "total_expenses",
    "period1_value": 25000.00,
    "period2_value": 28500.00,
    "difference": 3500.00,
    "percentage_change": 14.00,
    "trend": "up"
  },
  {
    "metric": "net_balance",
    "period1_value": 10000.00,
    "period2_value": 16500.00,
    "difference": 6500.00,
    "percentage_change": 65.00,
    "trend": "up"
  }
]
```

---

## 6. get_monthly_trends

Mostra a evolução de receitas e despesas ao longo dos meses com crescimento percentual.

### Parâmetros
- `p_company_id` (UUID) - ID da empresa
- `p_months_back` (INTEGER) - Quantidade de meses para trás (default: 12)

### Exemplo de chamada

```sql
-- Últimos 12 meses
SELECT * FROM get_monthly_trends(
  'your-company-uuid',
  12
);

-- Últimos 6 meses
SELECT * FROM get_monthly_trends(
  'your-company-uuid',
  6
);

-- Últimos 24 meses (2 anos)
SELECT * FROM get_monthly_trends(
  'your-company-uuid',
  24
);
```

### Exemplo via JavaScript (Supabase Client)

```javascript
const { data, error } = await supabase
  .rpc('get_monthly_trends', {
    p_company_id: companyId,
    p_months_back: 12
  });
```

### Retorno esperado

```json
[
  {
    "month_date": "2025-02-01",
    "month_name": "February  2025",
    "total_income": 35000.00,
    "total_expenses": 22000.00,
    "net_balance": 13000.00,
    "income_growth_percent": 12.50,
    "expense_growth_percent": 8.30
  },
  {
    "month_date": "2025-03-01",
    "month_name": "March     2025",
    "total_income": 42000.00,
    "total_expenses": 25000.00,
    "net_balance": 17000.00,
    "income_growth_percent": 20.00,
    "expense_growth_percent": 13.64
  }
]
```

---

## 7. get_transactions_by_payment_method

Agrupa transações por método de pagamento (à vista, parcelado, cartão de crédito).

### Parâmetros
- `p_company_id` (UUID) - ID da empresa
- `p_start_date` (DATE) - Data inicial
- `p_end_date` (DATE) - Data final

### Exemplo de chamada

```sql
SELECT * FROM get_transactions_by_payment_method(
  'your-company-uuid',
  '2026-01-01',
  '2026-01-31'
);
```

### Exemplo via JavaScript (Supabase Client)

```javascript
const { data, error } = await supabase
  .rpc('get_transactions_by_payment_method', {
    p_company_id: companyId,
    p_start_date: '2026-01-01',
    p_end_date: '2026-01-31'
  });
```

### Retorno esperado

```json
[
  {
    "payment_method": "À Vista",
    "total_amount": 35000.00,
    "transaction_count": 125,
    "avg_amount": 280.00,
    "percentage_of_total": 62.50
  },
  {
    "payment_method": "Cartão de Crédito",
    "total_amount": 15000.00,
    "transaction_count": 45,
    "avg_amount": 333.33,
    "percentage_of_total": 26.79
  },
  {
    "payment_method": "Parcelado",
    "total_amount": 6000.00,
    "transaction_count": 12,
    "avg_amount": 500.00,
    "percentage_of_total": 10.71
  }
]
```

---

## Uso em Contexto LLM

Estas funções foram projetadas para serem facilmente utilizadas por LLMs para responder perguntas sobre finanças da empresa. Exemplos de prompts:

### Exemplo 1: Análise Geral
```
Pergunta: "Como foram as finanças da empresa em janeiro?"

LLM deve chamar:
- get_transactions_statistics (visão geral)
- get_transactions_by_category (detalhamento por categoria)
- get_monthly_trends (comparar com meses anteriores)
```

### Exemplo 2: Comparação de Períodos
```
Pergunta: "As despesas aumentaram este mês comparado ao mês passado?"

LLM deve chamar:
- compare_transaction_periods (comparação direta)
```

### Exemplo 3: Análise de Categorias
```
Pergunta: "Quais são as maiores despesas por categoria?"

LLM deve chamar:
- get_transactions_by_category (com filtro p_type='expense')
- get_top_transactions (para ver transações específicas)
```

### Exemplo 4: Tendências
```
Pergunta: "Como está a evolução das receitas nos últimos meses?"

LLM deve chamar:
- get_monthly_trends (para ver crescimento)
- get_transactions_by_period (para granularidade)
```

---

## Notas Importantes

1. **Todas as funções retornam apenas transações pagas** (`status = 'paid'`) para refletir dados financeiros reais.

2. **Agregação automática**: Os dados são sempre agregados para evitar sobrecarga de informação.

3. **Segurança**: Todas as funções usam `SECURITY DEFINER` e validam o `company_id`.

4. **Percentuais**: Sempre que possível, os retornos incluem percentuais para facilitar análise.

5. **Valores NULL**: Categorias sem nome aparecem como "Sem Categoria".

6. **Limites configuráveis**: Funções que podem retornar muitos dados têm parâmetro de limite.

---

## Permissões

Todas as funções estão disponíveis para usuários autenticados (`authenticated` role).

```sql
GRANT EXECUTE ON FUNCTION public.get_transactions_by_period TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transactions_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transactions_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION public.compare_transaction_periods TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_trends TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_transactions_by_payment_method TO authenticated;
```
