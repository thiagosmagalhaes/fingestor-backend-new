# Documentação das Funções RPC do Supabase

Este documento descreve as funções RPC (Remote Procedure Call) do Supabase usadas no backend e seus outputs.

## get_dashboard_summary

**Descrição:** Retorna o resumo financeiro de um período específico.

**Parâmetros:**
- `p_company_id` (uuid): ID da empresa
- `p_start_date` (date): Data inicial do período
- `p_end_date` (date): Data final do período

**Output JSON:**
```json
{
  "balance": 5000.00,
  "total_income": 15000.00,
  "total_expense": 10000.00,
  "pending_income": 2000.00,
  "pending_expense": 3000.00
}
```

**Campos:**
- `balance`: Saldo (total_income - total_expense)
- `total_income`: Total de receitas pagas no período (usa `payment_date` quando disponível)
- `total_expense`: Total de despesas pagas no período (usa `payment_date` quando disponível)
- `pending_income`: Receitas pendentes (status 'pending' ou 'scheduled', excluindo cartão de crédito)
- `pending_expense`: Despesas pendentes + despesas de cartão de crédito com faturas vencendo no período

**Regra de Negócio:**
- Transações pagas usam `payment_date` se disponível, senão usam `date`
- Pendências excluem transações de cartão de crédito (exceto faturas que vencem no período)
- Despesas de cartão de crédito são incluídas quando a fatura vence dentro do período usando `get_invoice_period` e `due_day`

---

## get_cash_flow_chart_data

**Descrição:** Retorna dados de fluxo de caixa dos últimos N meses.

**Parâmetros:**
- `p_company_id` (uuid): ID da empresa
- `p_months` (integer): Quantidade de meses (padrão: 6)

**Output JSON:**
```json
[
  {
    "month": "Jan",
    "month_full": "2026-01-01",
    "receitas": 15000.00,
    "despesas": 10000.00,
    "saldo": 5000.00
  },
  {
    "month": "Feb",
    "month_full": "2026-02-01",
    "receitas": 18000.00,
    "despesas": 12000.00,
    "saldo": 6000.00
  }
]
```

**Campos:**
- `month`: Nome do mês abreviado (Ex: "Jan", "Feb", "Mar")
- `month_full`: Data completa do primeiro dia do mês no formato YYYY-MM-DD
- `receitas`: Total de receitas pagas no mês (usa `payment_date` quando disponível)
- `despesas`: Total de despesas pagas no mês (usa `payment_date` quando disponível)
- `saldo`: Saldo do mês (receitas - despesas)

**Regra de Negócio:**
- Retorna os últimos N meses em ordem cronológica
- Transações pagas usam `payment_date` se disponível, senão usam `date`
- Compras no cartão de crédito só contam quando a fatura foi paga

---

## Conversão de Nomenclatura

O backend converte os campos retornados pelas funções RPC para camelCase antes de enviar ao frontend:

### get_dashboard_summary
```typescript
// RPC Output (snake_case)         -> Frontend (camelCase)
{
  balance: 5000                     -> balance: 5000
  total_income: 15000               -> totalIncome: 15000
  total_expense: 10000              -> totalExpense: 10000
  pending_income: 2000              -> pendingIncome: 2000
  pending_expense: 3000             -> pendingExpense: 3000
}
```

### get_cash_flow_chart_data
```typescript
// RPC Output (português)           -> Frontend (inglês)
{
  month: "Jan"                      -> date: "Jan"
  month_full: "2026-01-01"          -> (não usado)
  receitas: 15000                   -> income: 15000
  despesas: 10000                   -> expense: 10000
  saldo: 5000                       -> balance: 5000
}
```

---

## Observações Importantes

1. **payment_date vs date**: As funções RPC usam `COALESCE(payment_date, date)` para considerar a data de pagamento efetiva quando disponível. Isso garante que compras no cartão de crédito sejam contabilizadas quando a fatura é paga, não quando a compra foi feita.

2. **Cartões de Crédito**: Tratamento especial no `get_dashboard_summary`:
   - Compras no cartão (`is_credit_card = true`) não entram nas pendências normais
   - Apenas faturas que vencem no período são incluídas em `pending_expense`
   - Usa `get_invoice_period()` para calcular o mês da fatura baseado no `closing_day`

3. **Status das Transações**: 
   - `paid`: Transação paga (contabilizada em total_income/total_expense)
   - `pending`: Aguardando pagamento
   - `scheduled`: Agendada para o futuro

4. **Tipos de Transação**:
   - `income`: Receita
   - `expense`: Despesa
