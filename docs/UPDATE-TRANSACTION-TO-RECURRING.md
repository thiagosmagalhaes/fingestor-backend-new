# Atualização de Transação: Conversão para Recorrente

## Visão Geral

A API agora permite converter uma **transação comum** em **transação recorrente** através do endpoint de atualização (`PUT /api/transactions/:id`).

## O que mudou?

Foram adicionados 3 novos campos opcionais ao endpoint de atualização de transações:

- `isRecurring` (boolean): Define se a transação deve se tornar recorrente
- `recurringFrequency` (string): Frequência da recorrência - valores aceitos: `"7"` (semanal), `"15"` (quinzenal), `"30"` (mensal)
- `recurringEndDate` (string): Data final da recorrência no formato ISO (YYYY-MM-DD) - **opcional**

## Regras de Negócio

### ✅ Pode converter em recorrente

Uma transação **comum** pode ser convertida em recorrente quando atende TODOS os requisitos:

- ✅ Não é uma transação recorrente (não possui `recurring_transaction_id`)
- ✅ Não é uma parcela de parcelamento (`is_installment = false` ou `total_installments = 1`)
- ✅ Não está vinculada a cartão de crédito (`is_credit_card = false` e `credit_card_id = null`)

### ❌ Não pode converter em recorrente

Retornará erro nas seguintes situações:

1. **Transação já é recorrente**
   - Erro: `"Esta transação já é recorrente e não pode ser convertida novamente"`

2. **Transação é uma parcela de parcelamento**
   - Erro: `"Não é possível converter uma parcela de parcelamento em transação recorrente"`

3. **Transação está vinculada a cartão de crédito**
   - Erro: `"Não é possível converter uma transação com cartão de crédito em recorrente"`

### Outras restrições importantes

- ❌ **Não é possível vincular cartão de crédito a uma transação recorrente**
  - Se tentar adicionar `creditCardId` ou `isCreditCard: true` em uma transação que já é recorrente, retorna erro
  
- ❌ **Não é possível parcelar uma transação recorrente**
  - Se tentar definir `isInstallment: true` em uma transação recorrente, retorna erro

## Como funciona a conversão?

Quando você envia `isRecurring: true` junto com `recurringFrequency`:

1. A transação atual é atualizada com os dados fornecidos (categoria, descrição, valor, etc)
2. É criada uma **regra de recorrência** no sistema
3. São geradas automaticamente **todas as transações futuras** baseadas na frequência
4. A transação atual é vinculada à regra de recorrência
5. Se não informar `recurringEndDate`, as transações serão geradas por **1 ano** a partir da data da transação

## Exemplos CURL

### 1. Converter transação comum em recorrente mensal

```bash
curl -X PUT "https://api.caixamestra.com/api/transactions/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "isRecurring": true,
    "recurringFrequency": "30",
    "recurringEndDate": "2026-12-31"
  }'
```

**Resultado**: A transação se torna recorrente mensalmente (a cada 30 dias) até 31/12/2026.

---

### 2. Converter em recorrente semanal sem data final

```bash
curl -X PUT "https://api.caixamestra.com/api/transactions/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "isRecurring": true,
    "recurringFrequency": "7"
  }'
```

**Resultado**: A transação se torna recorrente semanalmente (a cada 7 dias) por 1 ano.

---

### 3. Atualizar dados e converter para recorrente quinzenal

```bash
curl -X PUT "https://api.caixamestra.com/api/transactions/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Aluguel do Escritório",
    "amount": 2500.00,
    "isRecurring": true,
    "recurringFrequency": "15",
    "recurringEndDate": "2027-02-02"
  }'
```

**Resultado**: Atualiza a descrição e valor, e converte em recorrente quinzenalmente.

---

### 4. Tentativa de converter parcela (ERRO)

```bash
curl -X PUT "https://api.caixamestra.com/api/transactions/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "isRecurring": true,
    "recurringFrequency": "30"
  }'
```

**Resposta (400 Bad Request)**:
```json
{
  "error": "Não é possível converter uma parcela de parcelamento em transação recorrente"
}
```

---

### 5. Tentativa de vincular cartão a recorrente (ERRO)

```bash
curl -X PUT "https://api.caixamestra.com/api/transactions/550e8400-e29b-41d4-a716-446655440000?companyId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "isCreditCard": true,
    "creditCardId": "660e8400-e29b-41d4-a716-446655440000"
  }'
```

**Resposta (400 Bad Request)** - se a transação já for recorrente:
```json
{
  "error": "Não é possível vincular cartão de crédito a uma transação recorrente"
}
```

## Estrutura da Resposta

### Sucesso (200 OK)

Quando a conversão é bem-sucedida, a API retorna a transação atualizada com as informações da regra de recorrência:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "category_id": "789e4567-e89b-12d3-a456-426614174000",
  "description": "Aluguel do Escritório",
  "amount": 2500.00,
  "type": "expense",
  "date": "2026-02-01",
  "status": "pending",
  "recurring_transaction_id": "990e8400-e29b-41d4-a716-446655440000",
  "is_installment": false,
  "is_credit_card": false,
  "credit_card_id": null,
  "created_at": "2026-02-02T10:00:00Z",
  "updated_at": "2026-02-02T10:30:00Z",
  "category": {
    "id": "789e4567-e89b-12d3-a456-426614174000",
    "name": "Aluguel",
    "type": "expense",
    "color": "#FF5733"
  },
  "credit_card": null,
  "recurring_transaction": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "description": "Aluguel do Escritório",
    "frequency": "30",
    "start_date": "2026-02-01",
    "end_date": "2027-02-02",
    "is_active": true
  }
}
```

### Erro (400 Bad Request)

```json
{
  "error": "Mensagem de erro específica"
}
```

## Mensagens de Erro Possíveis

| Erro | Descrição |
|------|-----------|
| `"Frequência de recorrência deve ser \"7\" (semanal), \"15\" (quinzenal) ou \"30\" (mensal)"` | O valor de `recurringFrequency` é inválido |
| `"Esta transação já é recorrente e não pode ser convertida novamente"` | Tentou converter uma transação que já possui `recurring_transaction_id` |
| `"Não é possível converter uma parcela de parcelamento em transação recorrente"` | Tentou converter uma transação com `is_installment = true` e `total_installments > 1` |
| `"Não é possível converter uma transação com cartão de crédito em recorrente"` | Tentou converter uma transação com `is_credit_card = true` ou `credit_card_id` preenchido |
| `"Não é possível vincular cartão de crédito a uma transação recorrente"` | Tentou adicionar cartão de crédito a uma transação recorrente existente |
| `"Não é possível parcelar uma transação recorrente"` | Tentou definir `isInstallment: true` em uma transação recorrente |
| `"Transação não encontrada ou você não tem permissão"` | ID inválido ou a transação não pertence à empresa |

## Checklist de Implementação Frontend

Para implementar essa funcionalidade no frontend, você deve:

- [ ] Adicionar campos de entrada para `isRecurring`, `recurringFrequency` e `recurringEndDate` no formulário de edição
- [ ] Validar que o usuário só pode selecionar "converter para recorrente" se a transação for comum (não recorrente, não parcelada, sem cartão)
- [ ] Mostrar mensagem clara explicando quando a transação PODE e NÃO PODE ser convertida
- [ ] Implementar dropdown/select para `recurringFrequency` com as opções: "Semanal (7 dias)", "Quinzenal (15 dias)", "Mensal (30 dias)"
- [ ] Adicionar campo de data para `recurringEndDate` (opcional)
- [ ] Desabilitar opção de vincular cartão de crédito quando a transação já for recorrente
- [ ] Desabilitar opção de parcelar quando a transação já for recorrente
- [ ] Exibir badge/indicador visual quando uma transação for recorrente (usar campo `recurring_transaction_id`)
- [ ] Mostrar informações da regra de recorrência (frequência, data início, data fim) quando disponível
- [ ] Tratar os erros da API e exibir mensagens amigáveis ao usuário

## Informações Técnicas

- **Endpoint**: `PUT /api/transactions/:id`
- **Autenticação**: Bearer Token (obrigatório)
- **Query Params**: `companyId` (obrigatório)
- **Content-Type**: `application/json`
- **Novos campos opcionais no body**: `isRecurring`, `recurringFrequency`, `recurringEndDate`

## Observações Importantes

1. Ao converter uma transação em recorrente, o sistema **gera automaticamente** todas as transações futuras
2. As transações geradas terão status inicial baseado na data (passado = pending, futuro = scheduled)
3. A `recurringEndDate` é opcional - se não for informada, será gerada por 1 ano
4. Uma vez convertida em recorrente, a transação não pode ser "desconvertida" pela API de update
5. Para gerenciar transações recorrentes posteriormente, use os endpoints específicos de recorrência
