# Criar Transação com Parcelamento Automático

## Visão Geral

O endpoint `POST /api/transactions` agora cria **automaticamente todas as parcelas** quando `isInstallment: true` é informado. O frontend não precisa mais chamar o endpoint múltiplas vezes.

## Endpoint

```
POST /api/transactions
```

## Comportamento

### ✅ Antes (Antigo)
```javascript
// Frontend precisava chamar 12 vezes
for (let i = 1; i <= 12; i++) {
  await fetch('/api/transactions', {
    body: JSON.stringify({
      ...data,
      isInstallment: true,
      installmentNumber: i,
      totalInstallments: 12
    })
  });
}
```

### ✅ Agora (Novo)
```javascript
// Frontend chama apenas 1 vez, backend cria todas as 12 parcelas
await fetch('/api/transactions', {
  body: JSON.stringify({
    ...data,
    isInstallment: true,
    totalInstallments: 12
  })
});
```

## Request Body

### Transação Parcelada

```json
{
  "companyId": "uuid-da-empresa",
  "categoryId": "uuid-da-categoria",
  "type": "expense",
  "description": "Notebook Dell",
  "amount": 500,
  "date": "2026-02-01",
  "status": "pending",
  "isInstallment": true,
  "totalInstallments": 12,
  "notes": "Parcelado no cartão"
}
```

**Campos para Parcelamento:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `isInstallment` | boolean | ✅ | Deve ser `true` |
| `totalInstallments` | number | ✅ | Quantidade de parcelas (2-120) |
| `amount` | number | ✅ | Valor de CADA parcela |

**Removido:**
- ❌ `installmentNumber` - não é mais necessário (backend calcula)

## Regras de Geração

### 📅 Datas das Parcelas
- **Parcela 1**: Data informada no `date`
- **Parcela 2**: `date + 1 mês`
- **Parcela 3**: `date + 2 meses`
- **Parcela N**: `date + (N-1) meses`

### 📊 Status das Parcelas
- **Parcela 1**: Mantém o `status` informado
- **Demais parcelas**: Sempre `scheduled`

### 💰 Payment Date
- **Parcela 1**: Usa `paymentDate` se fornecido
- **Demais parcelas**: `null`

## Response

### Transação Parcelada

```json
{
  "message": "Parcelamento criado com sucesso: 12x de 500",
  "installments": [
    {
      "id": "uuid-1",
      "description": "Notebook Dell",
      "amount": 500,
      "date": "2026-02-01",
      "status": "pending",
      "is_installment": true,
      "installment_number": 1,
      "total_installments": 12
    },
    {
      "id": "uuid-2",
      "description": "Notebook Dell",
      "amount": 500,
      "date": "2026-03-01",
      "status": "scheduled",
      "is_installment": true,
      "installment_number": 2,
      "total_installments": 12
    },
    // ... 10 parcelas restantes
  ],
  "total_installments": 12,
  "total_amount": 6000
}
```

### Transação Normal (Não Parcelada)

```json
{
  "id": "uuid",
  "description": "Almoço",
  "amount": 50,
  "date": "2026-02-01",
  "status": "paid",
  "is_installment": false
}
```

## Exemplos de Uso

### Exemplo 1: Compra Parcelada em 6x

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "categoryId": "uuid-categoria",
    "type": "expense",
    "description": "Smart TV 55 polegadas",
    "amount": 400,
    "date": "2026-02-15",
    "status": "pending",
    "isInstallment": true,
    "totalInstallments": 6
  }'
```

**Resultado:**
```
Parcela 1/6: 15/02/2026 - R$ 400 (pending)
Parcela 2/6: 15/03/2026 - R$ 400 (scheduled)
Parcela 3/6: 15/04/2026 - R$ 400 (scheduled)
Parcela 4/6: 15/05/2026 - R$ 400 (scheduled)
Parcela 5/6: 15/06/2026 - R$ 400 (scheduled)
Parcela 6/6: 15/07/2026 - R$ 400 (scheduled)

Total: R$ 2.400
```

### Exemplo 2: Parcelamento no Cartão de Crédito

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "categoryId": "uuid-categoria",
    "type": "expense",
    "description": "Geladeira Brastemp",
    "amount": 350,
    "date": "2026-02-01",
    "status": "pending",
    "isInstallment": true,
    "totalInstallments": 10,
    "isCreditCard": true,
    "creditCardId": "uuid-cartao",
    "notes": "Parcelado sem juros"
  }'
```

**Resultado:**
- 10 parcelas de R$ 350
- Todas vinculadas ao cartão de crédito
- Total: R$ 3.500

### Exemplo 3: Primeira Parcela Paga

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-empresa",
    "categoryId": "uuid-categoria",
    "type": "expense",
    "description": "Curso Online",
    "amount": 150,
    "date": "2026-02-01",
    "status": "paid",
    "paymentDate": "2026-02-01T10:30:00Z",
    "isInstallment": true,
    "totalInstallments": 4
  }'
```

**Resultado:**
```
Parcela 1/4: 01/02/2026 - R$ 150 (paid) ✅
Parcela 2/4: 01/03/2026 - R$ 150 (scheduled)
Parcela 3/4: 01/04/2026 - R$ 150 (scheduled)
Parcela 4/4: 01/05/2026 - R$ 150 (scheduled)
```

## Validações

| Validação | Regra |
|-----------|-------|
| `totalInstallments` | Mínimo: 2, Máximo: 120 |
| `amount` | Deve ser > 0 |
| `isRecurring` | Não pode ser `true` se `isInstallment: true` |

## Diferença: Parcelamento vs Recorrência

| Característica | Parcelamento | Recorrência |
|----------------|--------------|-------------|
| **Propósito** | Dividir uma compra em N vezes | Despesa/receita repetida |
| **Total de transações** | Fixo (ex: 12 parcelas) | Indefinido ou até data final |
| **Valor total** | `amount × totalInstallments` | Ilimitado |
| **Datas** | +1 mês por parcela | 7, 15 ou 30 dias |
| **Campo** | `isInstallment: true` | `isRecurring: true` |
| **Cancelamento** | Deleta parcelas individuais | Cancela regra de recorrência |

## Compatibilidade Retroativa

⚠️ **Breaking Change**: O campo `installmentNumber` foi removido do request.

**Migração necessária no frontend:**

```diff
// Antes
{
  isInstallment: true,
-  installmentNumber: 1,
  totalInstallments: 12
}

// Depois
{
  isInstallment: true,
  totalInstallments: 12
}
```

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 201 | Parcelamento criado com sucesso |
| 400 | Validação falhou (totalInstallments < 2, > 120, etc.) |
| 401 | Não autenticado |
| 404 | Empresa/categoria/cartão não encontrado |
| 500 | Erro interno do servidor |
