# Guia de Frequência de Parcelamento

## Visão Geral

O sistema de parcelamento suporta três frequências diferentes para as parcelas:
- **7 dias** (semanal)
- **15 dias** (quinzenal)  
- **30 dias** (mensal) - padrão

## Parâmetro `recurringFrequency`

O mesmo parâmetro `recurringFrequency` usado para transações recorrentes também controla a frequência das parcelas em um parcelamento.

### Request Body

```json
{
  "companyId": "uuid",
  "categoryId": "uuid",
  "type": "expense",
  "description": "Descrição",
  "amount": 1000,
  "date": "2024-01-15",
  "status": "paid",
  "isInstallment": true,
  "totalInstallments": 6,
  "recurringFrequency": "7"  // "7", "15" ou "30"
}
```

## Exemplos Práticos

### 1. Parcelamento Semanal (7 dias)

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "categoryId": "123e4567-e89b-12d3-a456-426614174001",
    "type": "expense",
    "description": "Curso intensivo",
    "amount": 600,
    "date": "2024-01-15",
    "status": "paid",
    "isInstallment": true,
    "totalInstallments": 6,
    "recurringFrequency": "7"
  }'
```

**Resultado**: 6 parcelas de R$ 100,00 cada
- Parcela 1: 2024-01-15 (paid)
- Parcela 2: 2024-01-22 (scheduled)
- Parcela 3: 2024-01-29 (scheduled)
- Parcela 4: 2024-02-05 (scheduled)
- Parcela 5: 2024-02-12 (scheduled)
- Parcela 6: 2024-02-19 (scheduled)

**Response**:
```json
{
  "message": "Parcelamento semanal criado com sucesso: 6x de 100.00",
  "installments": [...],
  "total_installments": 6,
  "total_amount": 600,
  "installment_amount": 100,
  "frequency": "semanal",
  "frequency_days": 7
}
```

### 2. Parcelamento Quinzenal (15 dias)

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "categoryId": "123e4567-e89b-12d3-a456-426614174001",
    "type": "expense",
    "description": "Empréstimo pessoal",
    "amount": 1500,
    "date": "2024-01-01",
    "status": "pending",
    "isInstallment": true,
    "totalInstallments": 4,
    "recurringFrequency": "15"
  }'
```

**Resultado**: 4 parcelas de R$ 375,00 cada
- Parcela 1: 2024-01-01 (pending)
- Parcela 2: 2024-01-16 (scheduled)
- Parcela 3: 2024-01-31 (scheduled)
- Parcela 4: 2024-02-15 (scheduled)

**Response**:
```json
{
  "message": "Parcelamento quinzenal criado com sucesso: 4x de 375.00",
  "installments": [...],
  "total_installments": 4,
  "total_amount": 1500,
  "installment_amount": 375,
  "frequency": "quinzenal",
  "frequency_days": 15
}
```

### 3. Parcelamento Mensal (30 dias) - Padrão

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "categoryId": "123e4567-e89b-12d3-a456-426614174002",
    "type": "expense",
    "description": "iPhone 15 Pro",
    "amount": 7200,
    "date": "2024-01-10",
    "status": "paid",
    "isInstallment": true,
    "totalInstallments": 12,
    "isCreditCard": true,
    "creditCardId": "123e4567-e89b-12d3-a456-426614174003"
  }'
```

**Resultado**: 12 parcelas de R$ 600,00 cada
- Parcela 1: 2024-01-10 (paid)
- Parcela 2: 2024-02-09 (scheduled)
- Parcela 3: 2024-03-10 (scheduled)
- ...
- Parcela 12: 2024-12-09 (scheduled)

**Response**:
```json
{
  "message": "Parcelamento mensal criado com sucesso: 12x de 600.00",
  "installments": [...],
  "total_installments": 12,
  "total_amount": 7200,
  "installment_amount": 600,
  "frequency": "mensal",
  "frequency_days": 30
}
```

## Cálculo de Datas

### Fórmula
```
data_parcela[i] = data_inicial + (frequência_dias × (i - 1))
```

### Exemplo com 7 dias
```
Data inicial: 2024-01-15

Parcela 1: 2024-01-15 + (7 × 0) = 2024-01-15
Parcela 2: 2024-01-15 + (7 × 1) = 2024-01-22
Parcela 3: 2024-01-15 + (7 × 2) = 2024-01-29
Parcela 4: 2024-01-15 + (7 × 3) = 2024-02-05
```

### Exemplo com 15 dias
```
Data inicial: 2024-01-01

Parcela 1: 2024-01-01 + (15 × 0) = 2024-01-01
Parcela 2: 2024-01-01 + (15 × 1) = 2024-01-16
Parcela 3: 2024-01-01 + (15 × 2) = 2024-01-31
Parcela 4: 2024-01-01 + (15 × 3) = 2024-02-15
```

### Exemplo com 30 dias
```
Data inicial: 2024-01-10

Parcela 1: 2024-01-10 + (30 × 0) = 2024-01-10
Parcela 2: 2024-01-10 + (30 × 1) = 2024-02-09
Parcela 3: 2024-01-10 + (30 × 2) = 2024-03-10
```

## Regras de Validação

### Valores Aceitos
- `recurringFrequency`: `"7"`, `"15"` ou `"30"`
- Se omitido, assume `"30"` (mensal)

### Erros

**400 - Frequência inválida**
```json
{
  "error": "Frequência das parcelas deve ser \"7\" (semanal), \"15\" (quinzenal) ou \"30\" (mensal)"
}
```

**400 - Total de parcelas inválido**
```json
{
  "error": "Total de parcelas deve ser pelo menos 2"
}
```

```json
{
  "error": "Total de parcelas não pode ser maior que 120"
}
```

## Comparação: Parcelamento vs Recorrência

| Característica | Parcelamento | Recorrência |
|----------------|--------------|-------------|
| **Quantidade** | Finita (ex: 12x) | Infinita até data fim |
| **Valor** | Divide valor total | Repete mesmo valor |
| **Campo** | `totalInstallments` | `recurringEndDate` |
| **Frequência** | `recurringFrequency` | `recurringFrequency` |
| **Exemplo** | Compra de R$ 1200 em 12x de R$ 100 | Aluguel de R$ 1200 todo mês |

## Frontend - Exemplo de Uso

### TypeScript/React

```typescript
interface InstallmentForm {
  companyId: string;
  categoryId: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'scheduled';
  isInstallment: true;
  totalInstallments: number;
  recurringFrequency?: '7' | '15' | '30';  // Opcional
}

// Exemplo de chamada
const createInstallment = async (form: InstallmentForm) => {
  const response = await api.post('/transactions', {
    ...form,
    recurringFrequency: form.recurringFrequency || '30'  // Default mensal
  });
  
  console.log(`Criadas ${response.data.total_installments} parcelas`);
  console.log(`Frequência: ${response.data.frequency}`);
  console.log(`Valor por parcela: R$ ${response.data.installment_amount}`);
  
  return response.data;
};
```

### Formulário com Seleção de Frequência

```tsx
<select name="recurringFrequency">
  <option value="7">Semanal (7 dias)</option>
  <option value="15">Quinzenal (15 dias)</option>
  <option value="30" selected>Mensal (30 dias)</option>
</select>
```

## Casos de Uso Reais

### 1. Curso de Idiomas (Semanal)
- **Cenário**: Pagamento semanal de aulas
- **Frequência**: 7 dias
- **Exemplo**: 8 semanas × R$ 150 = R$ 1.200

### 2. Financiamento (Quinzenal)
- **Cenário**: Empréstimo com pagamento a cada 15 dias
- **Frequência**: 15 dias
- **Exemplo**: 6 parcelas × R$ 500 = R$ 3.000

### 3. Cartão de Crédito (Mensal)
- **Cenário**: Compra parcelada no cartão
- **Frequência**: 30 dias
- **Exemplo**: 12 parcelas × R$ 600 = R$ 7.200

## Benefícios

### Flexibilidade
- ✅ Adapta-se a diferentes necessidades de pagamento
- ✅ Permite financiamentos com prazos não convencionais
- ✅ Útil para empréstimos e cursos

### Precisão
- ✅ Datas calculadas por dias, não por meses
- ✅ Evita problemas com meses de diferentes tamanhos
- ✅ Previsibilidade total das datas

### Usabilidade
- ✅ Mesmo parâmetro para recorrência e parcelamento
- ✅ Valor padrão sensato (30 dias)
- ✅ Mensagens claras sobre a frequência escolhida

## Notas Importantes

1. **Compatibilidade**: O campo `recurringFrequency` é opcional para parcelamentos, mantendo compatibilidade com código existente

2. **Valor padrão**: Se não informado, assume 30 dias (comportamento mensal)

3. **Divisão de valor**: O valor total é dividido igualmente entre todas as parcelas

4. **Status inicial**: Apenas a primeira parcela recebe o status informado, as demais sempre iniciam como `scheduled`

5. **Cálculo por dias**: Usa incremento de dias (setDate), não incremento de meses (setMonth)

## Troubleshooting

### Problema: Parcelas com datas erradas
**Solução**: Verifique se está enviando `recurringFrequency` como string ("7", "15", "30")

### Problema: Erro de validação
**Solução**: Certifique-se de que `recurringFrequency` é um dos valores permitidos: "7", "15" ou "30"

### Problema: Valores não dividem exatamente
**Solução**: O sistema automaticamente arredonda para 2 casas decimais (ex: 1000 ÷ 3 = 333.33)
