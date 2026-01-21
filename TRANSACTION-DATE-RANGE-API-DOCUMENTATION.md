# API Transaction Date Range - Documentação

Endpoint para obter o período de transações disponíveis (primeira e última transação).

**Base URL**: `/api/dashboard/transaction-date-range`

**Autenticação**: Requer token JWT no header `Authorization: Bearer <token>`

---

## Endpoint

### GET /api/dashboard/transaction-date-range

Retorna o mês/ano da primeira e última transação da empresa.

#### Query Parameters:
- `companyId` (string, obrigatório) - ID da empresa

#### Respostas:

**200 OK - Com Transações**
```json
{
  "first_transaction": {
    "month": 1,
    "year": 2025,
    "date": "2025-01-15"
  },
  "last_transaction": {
    "month": 1,
    "year": 2026,
    "date": "2026-01-20"
  }
}
```

**200 OK - Sem Transações**
```json
{
  "first_transaction": null,
  "last_transaction": null
}
```

**400 Bad Request**
```json
{
  "error": "companyId é obrigatório"
}
```

**500 Internal Server Error**
```json
{
  "error": "Erro ao buscar período de transações"
}
```

---

## Estrutura dos Dados

### Campos:
- `first_transaction` (object | null) - Informações da primeira transação
  - `month` (number) - Mês (1-12)
  - `year` (number) - Ano (YYYY)
  - `date` (string) - Data completa no formato ISO (YYYY-MM-DD)
- `last_transaction` (object | null) - Informações da última transação
  - `month` (number) - Mês (1-12)
  - `year` (number) - Ano (YYYY)
  - `date` (string) - Data completa no formato ISO (YYYY-MM-DD)

---

## Exemplo de cURL

```bash
curl -X GET "http://localhost:3000/api/dashboard/transaction-date-range?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Casos de Uso

### 1. Popular Seletores de Data
Use para definir os limites de mês/ano em filtros e seletores:

```typescript
const { data } = await api.get('/dashboard/transaction-date-range', {
  params: { companyId }
});

// Configurar datepicker com limites
if (data.first_transaction && data.last_transaction) {
  const minDate = new Date(data.first_transaction.date);
  const maxDate = new Date(data.last_transaction.date);
  
  // Usar em componentes de data
  <DatePicker minDate={minDate} maxDate={maxDate} />
}
```

### 2. Gerar Lista de Meses Disponíveis
```typescript
const generateMonthOptions = (dateRange) => {
  if (!dateRange.first_transaction) return [];
  
  const months = [];
  const start = new Date(dateRange.first_transaction.year, dateRange.first_transaction.month - 1);
  const end = new Date(dateRange.last_transaction.year, dateRange.last_transaction.month - 1);
  
  while (start <= end) {
    months.push({
      month: start.getMonth() + 1,
      year: start.getFullYear(),
      label: start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    });
    start.setMonth(start.getMonth() + 1);
  }
  
  return months;
};
```

### 3. Validar Período de Relatórios
Verifique se a empresa tem dados antes de gerar relatórios:

```typescript
const { data } = await api.get('/dashboard/transaction-date-range', {
  params: { companyId }
});

if (!data.first_transaction) {
  showMessage('Nenhuma transação encontrada. Adicione transações para gerar relatórios.');
  return;
}

// Proceder com geração de relatório
```

---

## Regras de Negócio

### Ordenação:
- ✅ Busca por ordem crescente de data (mais antiga para mais recente)
- ✅ Primeira transação = menor data
- ✅ Última transação = maior data

### Observações:
- ✅ Retorna `null` quando não há transações
- ✅ Considera todas as transações independente de status (paid, pending, scheduled)
- ✅ Considera todos os tipos (income e expense)
- ✅ Ideal para configurar filtros de data na UI
- ✅ Use para validar períodos antes de gerar relatórios

---

## Segurança

- ✅ Requer autenticação JWT
- ✅ Row Level Security (RLS) no Supabase garante isolamento de dados
- ✅ Apenas transações da empresa especificada são consultadas
