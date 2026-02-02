# Transações Recorrentes - Documentação

## Visão Geral

As transações recorrentes permitem criar transações automáticas que se repetem em intervalos regulares (7, 15 ou 30 dias). O sistema gera automaticamente todas as transações até a data final especificada ou até 1 ano se não especificada.

## Características

- ✅ **Frequências**: 7 dias (semanal), 15 dias (quinzenal), 30 dias (mensal)
- ✅ **Geração automática**: Cria todas as transações até o final ou 1 ano
- ✅ **Cron job**: Gera transações futuras automaticamente após a data
- ✅ **Transações independentes**: Cada transação pode ser editada/deletada individualmente
- ✅ **Mesmo endpoint**: Usa `POST /api/transactions` com campos adicionais

## Como Criar

### 1. Transação Recorrente com Data Final

Gera todas as transações até a data especificada.

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "categoryId": "uuid-da-categoria",
    "type": "expense",
    "description": "Aluguel",
    "amount": 1500,
    "date": "2026-02-01",
    "status": "pending",
    "isRecurring": true,
    "recurringFrequency": "30",
    "recurringEndDate": "2028-02-01"
  }'
```

**Response:**
```json
{
  "message": "Transação recorrente criada com sucesso",
  "recurring_rule": {
    "id": "uuid-da-regra",
    "company_id": "uuid-da-empresa",
    "description": "Aluguel",
    "amount": 1500,
    "frequency": "30",
    "start_date": "2026-02-01",
    "end_date": "2028-02-01",
    "is_active": true
  },
  "info": "Transações geradas até 2028-02-01"
}
```

### 2. Transação Recorrente Sem Data Final

Gera transações por 1 ano. O cron job continuará gerando automaticamente.

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "categoryId": "uuid-da-categoria",
    "type": "income",
    "description": "Salário",
    "amount": 5000,
    "date": "2026-02-05",
    "status": "pending",
    "isRecurring": true,
    "recurringFrequency": "30"
  }'
```

### 3. Transação Semanal (7 dias)

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "categoryId": "uuid-da-categoria",
    "type": "expense",
    "description": "Academia",
    "amount": 100,
    "date": "2026-02-03",
    "status": "pending",
    "isRecurring": true,
    "recurringFrequency": "7",
    "recurringEndDate": "2026-12-31"
  }'
```

### 4. Transação Quinzenal (15 dias)

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "categoryId": "uuid-da-categoria",
    "type": "expense",
    "description": "Supermercado",
    "amount": 300,
    "date": "2026-02-01",
    "status": "pending",
    "isRecurring": true,
    "recurringFrequency": "15",
    "recurringEndDate": "2026-06-30"
  }'
```

## Campos do Request

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `companyId` | string | ✅ | ID da empresa |
| `categoryId` | string | ✅ | ID da categoria |
| `type` | string | ✅ | `"income"` ou `"expense"` |
| `description` | string | ✅ | Descrição da transação |
| `amount` | number | ✅ | Valor (deve ser > 0) |
| `date` | string | ✅ | Data inicial (ISO format) |
| `status` | string | ✅ | `"paid"`, `"pending"` ou `"scheduled"` |
| `isRecurring` | boolean | ⚠️ | `true` para criar recorrência |
| `recurringFrequency` | string | ⚠️ | `"7"`, `"15"` ou `"30"` |
| `recurringEndDate` | string | ❌ | Data final (opcional, default: 1 ano) |
| `notes` | string | ❌ | Observações |

⚠️ = Obrigatório quando `isRecurring: true`

## Comportamento

### Geração Inicial

Quando você cria uma recorrência:
1. **Com `recurringEndDate`**: Gera TODAS as transações até essa data
2. **Sem `recurringEndDate`**: Gera transações por 1 ano a partir de `date`

### Cron Job (Diário às 00:00)

- Verifica recorrências ativas sem `recurringEndDate`
- Gera novas transações conforme necessário
- Mantém sempre transações futuras disponíveis

### Transações Geradas

Cada transação gerada:
- ✅ Aparece na listagem normal (`GET /api/transactions`)
- ✅ Pode ser editada individualmente (`PUT /api/transactions/:id`)
- ✅ Pode ser deletada (`DELETE /api/transactions/:id`)
- ✅ Pode ter status alterado (pending → paid)
- ✅ Contém referência à regra (`recurring_transaction_id`)

## Exemplos de Uso

### Caso 1: Aluguel Mensal por 2 Anos

```json
{
  "description": "Aluguel escritório",
  "amount": 2000,
  "date": "2026-02-05",
  "isRecurring": true,
  "recurringFrequency": "30",
  "recurringEndDate": "2028-02-05"
}
```

**Resultado**: ~24 transações criadas (2 anos × 12 meses)

### Caso 2: Salário Mensal Indefinido

```json
{
  "description": "Salário",
  "amount": 5000,
  "date": "2026-02-05",
  "isRecurring": true,
  "recurringFrequency": "30"
}
```

**Resultado**: 
- Inicialmente: 12 transações (1 ano)
- Cron continua gerando indefinidamente

### Caso 3: Academia Semanal por 6 Meses

```json
{
  "description": "Academia",
  "amount": 100,
  "date": "2026-02-03",
  "isRecurring": true,
  "recurringFrequency": "7",
  "recurringEndDate": "2026-08-03"
}
```

**Resultado**: ~26 transações criadas (6 meses × ~4 semanas)

## Limitações

- ❌ Não é possível criar transação recorrente E parcelada ao mesmo tempo
- ❌ Não é possível vincular recorrência a cartão de crédito
- ✅ Limite de segurança: máximo 500 transações por geração

## Validações

- `recurringFrequency` deve ser `"7"`, `"15"` ou `"30"`
- `recurringEndDate` deve ser posterior a `date`
- Não permitido com `isInstallment: true`
- Todos os campos obrigatórios de transação normal devem ser fornecidos

## Status das Transações Geradas

- **Data <= hoje**: `status: "pending"`
- **Data > hoje**: `status: "scheduled"`

O usuário pode alterar conforme necessário.

## Estrutura no Banco

### Tabela `recurring_transactions`
```sql
- id: uuid
- company_id: uuid
- category_id: uuid
- type: transaction_type
- description: text
- amount: numeric
- frequency: '7' | '15' | '30'
- start_date: date
- end_date: date (nullable)
- is_active: boolean
- last_generated_date: date
- next_generation_date: date
```

### Tabela `transactions`
```sql
- ... (campos normais)
- recurring_transaction_id: uuid (referência à regra)
```

## Endpoints de Gerenciamento

### 1. Listar Regras de Recorrência Ativas

Retorna todas as regras de recorrência ativas da empresa.

```bash
curl -X GET "http://localhost:3001/api/transactions/recurring?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Response:**
```json
[
  {
    "id": "uuid-da-regra",
    "company_id": "uuid-da-empresa",
    "category_id": "uuid-da-categoria",
    "type": "expense",
    "description": "Aluguel",
    "amount": 1500,
    "frequency": "30",
    "start_date": "2026-02-01",
    "end_date": "2028-02-01",
    "is_active": true,
    "last_generated_date": "2027-01-01",
    "next_generation_date": "2027-02-01",
    "created_at": "2026-02-01T10:00:00Z",
    "updated_at": "2026-02-01T10:00:00Z"
  }
]
```

### 2. Pausar Recorrência

Para temporariamente a geração de novas transações.

```bash
curl -X PATCH "http://localhost:3001/api/transactions/recurring/uuid-da-regra/pause?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Response:**
```json
{
  "message": "Recorrência pausada com sucesso"
}
```

**Efeito:**
- `is_active` → `false`
- Cron job não gera mais transações
- Transações já criadas não são afetadas

### 3. Retomar Recorrência

Reativa uma recorrência pausada.

```bash
curl -X PATCH "http://localhost:3001/api/transactions/recurring/uuid-da-regra/resume?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Response:**
```json
{
  "message": "Recorrência retomada com sucesso"
}
```

**Efeito:**
- `is_active` → `true`
- Cron job volta a gerar transações

### 4. Cancelar Recorrência

Cancela permanentemente uma recorrência.

```bash
curl -X DELETE "http://localhost:3001/api/transactions/recurring/uuid-da-regra?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Response:**
```json
{
  "message": "Recorrência cancelada com sucesso. As transações já criadas não foram afetadas."
}
```

**Efeito:**
- `is_active` → `false`
- Não gera mais transações
- Transações já criadas permanecem intactas

## Informação de Recorrência nas Transações

### GET /api/transactions

Agora retorna `recurringTransactionId` e `recurringInfo`:

```json
{
  "data": [
    {
      "id": "uuid-transacao",
      "description": "Aluguel",
      "amount": 1500,
      "recurringTransactionId": "uuid-da-regra",
      "recurringInfo": {
        "id": "uuid-da-regra",
        "description": "Aluguel",
        "frequency": "30",
        "isActive": true
      }
    }
  ]
}
```

### GET /api/transactions/:id

Retorna informação completa da recorrência:

```json
{
  "id": "uuid-transacao",
  "description": "Aluguel",
  "amount": 1500,
  "recurring_transaction": {
    "id": "uuid-da-regra",
    "description": "Aluguel",
    "frequency": "30",
    "start_date": "2026-02-01",
    "end_date": "2028-02-01",
    "is_active": true
  }
}
```

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 201 | Recorrência criada com sucesso |
| 400 | Validação falhou (frequência inválida, parcelado + recorrente, etc.) |
| 401 | Não autenticado |
| 404 | Empresa/categoria não encontrada |
| 500 | Erro interno do servidor |
