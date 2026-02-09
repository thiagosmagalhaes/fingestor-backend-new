# Documentação de API - Formas de Pagamento (PDV)

## Visão Geral

Esta documentação descreve os endpoints disponíveis para gerenciar formas de pagamento customizáveis do sistema PDV (Ponto de Venda). Cada empresa pode cadastrar suas próprias formas de pagamento com taxas individualizadas.

Por padrão, toda empresa já vem com a forma de pagamento "Dinheiro" cadastrada.

## Autenticação

Todos os endpoints requerem autenticação via token Bearer:

```
Authorization: Bearer {seu_access_token}
```

---

## 1. Formas de Pagamento

### 1.1. Listar Formas de Pagamento

**Endpoint:** `GET /api/payment-methods`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `includeInactive` (opcional): `true` para incluir formas de pagamento inativas. Por padrão retorna apenas ativas.

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/payment-methods?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "uuid-1",
    "company_id": "uuid-da-empresa",
    "name": "Dinheiro",
    "type": "cash",
    "card_type": null,
    "card_brand": null,
    "fee_percentage": 0,
    "fee_fixed_amount": 0,
    "installment_fees": {},
    "is_active": true,
    "is_default": true,
    "allow_installments": false,
    "max_installments": 1,
    "min_installment_amount": 0,
    "display_order": 0,
    "metadata": {},
    "created_at": "2026-02-08T10:00:00Z",
    "updated_at": "2026-02-08T10:00:00Z",
    "deleted_at": null
  },
  {
    "id": "uuid-2",
    "company_id": "uuid-da-empresa",
    "name": "PIX",
    "type": "pix",
    "card_type": null,
    "card_brand": null,
    "fee_percentage": 1.5,
    "fee_fixed_amount": 0,
    "installment_fees": {},
    "is_active": true,
    "is_default": false,
    "allow_installments": false,
    "max_installments": 1,
    "min_installment_amount": 0,
    "display_order": 1,
    "metadata": {},
    "created_at": "2026-02-08T10:00:00Z",
    "updated_at": "2026-02-08T10:00:00Z",
    "deleted_at": null
  },
  {
    "id": "uuid-3",
    "company_id": "uuid-da-empresa",
    "name": "Cartão Visa Crédito",
    "type": "card",
    "card_type": "credit",
    "card_brand": "Visa",
    "fee_percentage": 0,
    "fee_fixed_amount": 0,
    "installment_fees": {
      "1": 2.5,
      "2": 3.0,
      "3": 3.5,
      "6": 4.0,
      "12": 5.0
    },
    "is_active": true,
    "is_default": false,
    "allow_installments": true,
    "max_installments": 12,
    "min_installment_amount": 50,
    "display_order": 2,
    "metadata": {},
    "created_at": "2026-02-08T10:00:00Z",
    "updated_at": "2026-02-08T10:00:00Z",
    "deleted_at": null
  }
]
```

**Regras de Implementação do Frontend:**

1. Exibir as formas de pagamento ordenadas por `display_order`
2. Destacar visualmente qual é a forma de pagamento padrão (`is_default: true`)
3. Exibir badge ou indicador para formas inativas se `includeInactive=true`
4. Para formas do tipo `card`, exibir também `card_brand` e `card_type`
5. Mostrar ícones apropriados para cada `type`: cash (💵), pix (📱), card (💳), other (📄)

---

### 1.2. Buscar Forma de Pagamento por ID

**Endpoint:** `GET /api/payment-methods/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/payment-methods/uuid-da-forma-pagamento?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-3",
  "company_id": "uuid-da-empresa",
  "name": "Cartão Visa Crédito",
  "type": "card",
  "card_type": "credit",
  "card_brand": "Visa",
  "fee_percentage": 0,
  "fee_fixed_amount": 0,
  "installment_fees": {
    "1": 2.5,
    "2": 3.0,
    "3": 3.5,
    "6": 4.0,
    "12": 5.0
  },
  "is_active": true,
  "is_default": false,
  "allow_installments": true,
  "max_installments": 12,
  "min_installment_amount": 50,
  "display_order": 2,
  "metadata": {},
  "created_at": "2026-02-08T10:00:00Z",
  "updated_at": "2026-02-08T10:00:00Z",
  "deleted_at": null
}
```

**Resposta de Erro (404):**

```json
{
  "error": "Forma de pagamento não encontrada"
}
```

---

### 1.3. Criar Forma de Pagamento

**Endpoint:** `POST /api/payment-methods`

**Body:**

```json
{
  "companyId": "uuid-da-empresa",
  "name": "Cartão Mastercard Crédito",
  "type": "card",
  "cardType": "credit",
  "cardBrand": "Mastercard",
  "feePercentage": 0,
  "feeFixedAmount": 0,
  "installmentFees": {
    "1": 2.8,
    "2": 3.2,
    "3": 3.7,
    "6": 4.2,
    "12": 5.2
  },
  "isActive": true,
  "isDefault": false,
  "allowInstallments": true,
  "maxInstallments": 12,
  "minInstallmentAmount": 50,
  "displayOrder": 3
}
```

**Campos Obrigatórios:**
- `companyId`: UUID da empresa
- `name`: Nome da forma de pagamento
- `type`: Tipo - deve ser `cash`, `pix`, `card` ou `other`

**Campos Condicionais:**
- Se `type` for `card`:
  - `cardType` (obrigatório): `debit`, `credit` ou `both`

**Campos Opcionais:**
- `cardBrand`: Bandeira do cartão (ex: Visa, Mastercard, Elo, Amex)
- `feePercentage`: Taxa percentual (padrão: 0)
- `feeFixedAmount`: Taxa fixa em valor (padrão: 0)
- `installmentFees`: Objeto com taxas por número de parcelas (padrão: {})
- `isActive`: Se está ativa (padrão: true)
- `isDefault`: Se é padrão (padrão: false)
- `allowInstallments`: Permite parcelamento (padrão: false)
- `maxInstallments`: Número máximo de parcelas (padrão: 1)
- `minInstallmentAmount`: Valor mínimo por parcela (padrão: 0)
- `displayOrder`: Ordem de exibição (padrão: 999)
- `metadata`: Objeto JSON com dados adicionais (padrão: {})

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/payment-methods" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "name": "PIX",
    "type": "pix",
    "feePercentage": 1.5,
    "isActive": true,
    "displayOrder": 1
  }'
```

**Resposta de Sucesso (201):**

```json
{
  "id": "uuid-novo",
  "company_id": "uuid-da-empresa",
  "name": "PIX",
  "type": "pix",
  "card_type": null,
  "card_brand": null,
  "fee_percentage": 1.5,
  "fee_fixed_amount": 0,
  "installment_fees": {},
  "is_active": true,
  "is_default": false,
  "allow_installments": false,
  "max_installments": 1,
  "min_installment_amount": 0,
  "display_order": 1,
  "metadata": {},
  "created_at": "2026-02-08T10:00:00Z",
  "updated_at": "2026-02-08T10:00:00Z",
  "deleted_at": null
}
```

**Regras de Implementação do Frontend:**

1. **Validar campos obrigatórios** antes de enviar
2. **Se `type` = `card`**: mostrar campos `cardType` (obrigatório) e `cardBrand` (opcional)
3. **Se `allowInstallments` = true**: mostrar campos `maxInstallments` e `minInstallmentAmount`
4. **Para `installmentFees`**: permitir criar um objeto onde a chave é o número de parcelas e o valor é a taxa percentual
   - Exemplo: parcelamento em 3x com taxa de 3.5% = `{"3": 3.5}`
5. **Apenas uma forma de pagamento** pode ser `isDefault: true` por empresa (o backend garante isso automaticamente)
6. Sugerir valores padrão apropriados para cada tipo:
   - `cash`: sem taxas
   - `pix`: taxa entre 0.5% a 2%
   - `card`: taxas variadas por parcela

---

### 1.4. Atualizar Forma de Pagamento

**Endpoint:** `PUT /api/payment-methods/:id`

**Body:**

Todos os campos são opcionais. Envie apenas os campos que deseja atualizar.

```json
{
  "companyId": "uuid-da-empresa",
  "name": "Cartão Mastercard Crédito - Promoção",
  "installmentFees": {
    "1": 2.5,
    "2": 2.7,
    "3": 3.0,
    "6": 3.5,
    "12": 4.5
  },
  "isActive": true
}
```

**Exemplo de Requisição:**

```bash
curl -X PUT "https://api.fingestor.com/api/payment-methods/uuid-da-forma-pagamento" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "feePercentage": 2.0,
    "isActive": true
  }'
```

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-da-forma-pagamento",
  "company_id": "uuid-da-empresa",
  "name": "PIX",
  "type": "pix",
  "card_type": null,
  "card_brand": null,
  "fee_percentage": 2.0,
  "fee_fixed_amount": 0,
  "installment_fees": {},
  "is_active": true,
  "is_default": false,
  "allow_installments": false,
  "max_installments": 1,
  "min_installment_amount": 0,
  "display_order": 1,
  "metadata": {},
  "created_at": "2026-02-08T10:00:00Z",
  "updated_at": "2026-02-08T10:15:00Z",
  "deleted_at": null
}
```

**Resposta de Erro (404):**

```json
{
  "error": "Forma de pagamento não encontrada"
}
```

---

### 1.5. Excluir Forma de Pagamento

**Endpoint:** `DELETE /api/payment-methods/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Exemplo de Requisição:**

```bash
curl -X DELETE "https://api.fingestor.com/api/payment-methods/uuid-da-forma-pagamento?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

```json
{
  "message": "Forma de pagamento excluída com sucesso"
}
```

**Resposta de Erro (400):**

Se tentar excluir a forma de pagamento padrão:

```json
{
  "error": "Não é possível excluir a forma de pagamento padrão. Defina outra como padrão antes."
}
```

**Resposta de Erro (404):**

```json
{
  "error": "Forma de pagamento não encontrada"
}
```

**Regras de Implementação do Frontend:**

1. **Confirmar antes de excluir** com um modal de confirmação
2. **Não permitir excluir** a forma de pagamento padrão (`is_default: true`)
3. Sugerir ao usuário definir outra forma como padrão antes de excluir a atual
4. Após excluir, atualizar a lista de formas de pagamento

**Nota:** Esta é uma exclusão soft delete (define `deleted_at`), não remove o registro do banco.

---

### 1.6. Calcular Taxa de Forma de Pagamento

**Endpoint:** `POST /api/payment-methods/calculate-fee`

Este endpoint calcula automaticamente a taxa de uma forma de pagamento com base no valor e número de parcelas.

**Body:**

```json
{
  "companyId": "uuid-da-empresa",
  "paymentMethodId": "uuid-da-forma-pagamento",
  "amount": 1000.00,
  "installments": 3
}
```

**Campos Obrigatórios:**
- `companyId`: UUID da empresa
- `paymentMethodId`: UUID da forma de pagamento
- `amount`: Valor da venda (deve ser maior que 0)

**Campos Opcionais:**
- `installments`: Número de parcelas (padrão: 1)

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/payment-methods/calculate-fee" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "paymentMethodId": "uuid-cartao-visa",
    "amount": 1000.00,
    "installments": 3
  }'
```

**Resposta de Sucesso (200):**

```json
{
  "amount": 1000.00,
  "feeAmount": 35.00,
  "totalAmount": 1035.00,
  "feePercentage": 3.5,
  "feeFixedAmount": 0
}
```

**Explicação da Resposta:**
- `amount`: Valor original da venda
- `feeAmount`: Valor da taxa aplicada (R$ 35,00)
- `totalAmount`: Valor total com taxa (R$ 1.035,00)
- `feePercentage`: Percentual da taxa aplicada (3.5%)
- `feeFixedAmount`: Valor fixo da taxa (R$ 0,00)

**Resposta de Erro (404):**

```json
{
  "error": "Forma de pagamento não encontrada"
}
```

**Regras de Implementação do Frontend:**

1. **Chamar este endpoint** sempre que o usuário:
   - Selecionar uma forma de pagamento
   - Alterar o valor da venda
   - Alterar o número de parcelas
2. **Exibir claramente** para o usuário:
   - Valor original
   - Taxa aplicada
   - Valor total
3. **Se houver taxa**: destacar visualmente para o cliente saber o custo
4. **Para cartões com parcelamento**: 
   - Se a forma de pagamento tiver `installment_fees` configurado, a taxa varia por parcela
   - Mostrar uma tabela ou lista comparativa das taxas por número de parcelas
5. **Validações**:
   - Se `installments` > `max_installments` da forma de pagamento: mostrar erro
   - Se valor da parcela < `min_installment_amount`: mostrar erro

---

## 2. Tipos de Forma de Pagamento

### 2.1. Dinheiro (`type: "cash"`)

- Geralmente sem taxas
- Não permite parcelamento
- É criado automaticamente como padrão para novas empresas

**Exemplo:**

```json
{
  "name": "Dinheiro",
  "type": "cash",
  "feePercentage": 0,
  "feeFixedAmount": 0,
  "allowInstallments": false,
  "isDefault": true
}
```

---

### 2.2. PIX (`type: "pix"`)

- Geralmente tem taxa percentual pequena (0.5% a 2%)
- Não permite parcelamento
- Pagamento instantâneo

**Exemplo:**

```json
{
  "name": "PIX",
  "type": "pix",
  "feePercentage": 1.5,
  "feeFixedAmount": 0,
  "allowInstallments": false
}
```

---

### 2.3. Cartão (`type: "card"`)

- Requer `cardType`: `debit`, `credit` ou `both`
- Permite informar `cardBrand`: Visa, Mastercard, Elo, Amex, etc
- Para cartões de **débito**: geralmente taxa fixa sem parcelamento
- Para cartões de **crédito**: 
  - Pode permitir parcelamento (`allowInstallments: true`)
  - Pode ter taxas diferentes por número de parcelas (`installmentFees`)
  - Cada parcela pode ter taxa específica

**Exemplo - Cartão de Débito:**

```json
{
  "name": "Cartão Visa Débito",
  "type": "card",
  "cardType": "debit",
  "cardBrand": "Visa",
  "feePercentage": 2.0,
  "feeFixedAmount": 0,
  "allowInstallments": false
}
```

**Exemplo - Cartão de Crédito com Parcelamento:**

```json
{
  "name": "Cartão Mastercard Crédito",
  "type": "card",
  "cardType": "credit",
  "cardBrand": "Mastercard",
  "feePercentage": 0,
  "feeFixedAmount": 0,
  "installmentFees": {
    "1": 2.5,
    "2": 3.0,
    "3": 3.5,
    "6": 4.0,
    "12": 5.0
  },
  "allowInstallments": true,
  "maxInstallments": 12,
  "minInstallmentAmount": 50
}
```

**Explicação do `installmentFees`:**
- Chave: número de parcelas
- Valor: taxa percentual para aquele número de parcelas
- Se o número de parcelas não estiver no objeto, usa `feePercentage`
- No exemplo acima:
  - 1x: 2.5%
  - 2x: 3.0%
  - 3x: 3.5%
  - 6x: 4.0%
  - 12x: 5.0%

---

### 2.4. Outros (`type: "other"`)

- Para formas de pagamento não categorizadas
- Pode ser: boleto, cheque, vale-presente, crediário, etc
- Totalmente customizável pelo usuário

**Exemplo:**

```json
{
  "name": "Boleto Bancário",
  "type": "other",
  "feePercentage": 1.0,
  "feeFixedAmount": 2.50,
  "allowInstallments": false
}
```

---

## 3. Fluxo de Uso no PDV

### 3.1. Ao Finalizar uma Venda

1. **Listar formas de pagamento** ativas da empresa (`GET /api/payment-methods?companyId=xxx`)
2. **Usuário seleciona** a forma de pagamento
3. **Se a forma permitir parcelamento** (`allow_installments: true`):
   - Mostrar opção de parcelamento
   - Validar se número de parcelas <= `max_installments`
   - Validar se valor de cada parcela >= `min_installment_amount`
4. **Calcular taxa** (`POST /api/payment-methods/calculate-fee`)
5. **Exibir resumo** para o cliente:
   - Valor da venda
   - Forma de pagamento
   - Número de parcelas (se aplicável)
   - Taxa aplicada
   - Valor total
6. **Confirmar venda** salvando com `payment_method` (pode salvar o ID ou nome da forma de pagamento)

### 3.2. Exemplo de Interface

```
┌─────────────────────────────────────────┐
│ Finalizar Venda                         │
├─────────────────────────────────────────┤
│ Subtotal:           R$ 1.000,00         │
│                                         │
│ Forma de Pagamento: [v]                 │
│ ┌─────────────────────────────────────┐ │
│ │ 💵 Dinheiro (padrão)                │ │
│ │ 📱 PIX - Taxa: 1.5%                 │ │
│ │ 💳 Visa Débito - Taxa: 2%           │ │
│ │ 💳 Visa Crédito - Taxa: 2.5% a 5%  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [✓] Parcelar em: [v] 3x                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📊 Resumo                           │ │
│ │ Valor:           R$ 1.000,00        │ │
│ │ Taxa (3.5%):     R$    35,00        │ │
│ │ ─────────────────────────────────── │ │
│ │ Total:           R$ 1.035,00        │ │
│ │ 3x de R$ 345,00                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Cancelar]        [Confirmar Venda]     │
└─────────────────────────────────────────┘
```

---

## 4. Gestão de Formas de Pagamento

### 4.1. Tela de Configuração

O frontend deve ter uma tela de configuração onde o usuário pode:

1. **Listar** todas as formas de pagamento
2. **Criar** novas formas de pagamento
3. **Editar** formas existentes
4. **Ativar/desativar** formas de pagamento
5. **Excluir** formas de pagamento (exceto a padrão)
6. **Definir como padrão** uma forma de pagamento
7. **Reordenar** formas de pagamento (usando `display_order`)

### 4.2. Formulário de Criação/Edição

O formulário deve conter:

**Campos Básicos:**
- Nome da forma de pagamento
- Tipo (cash, pix, card, other)
- Status (ativa/inativa)
- Marcar como padrão

**Se tipo = "card":**
- Tipo de cartão (débito, crédito, ambos)
- Bandeira do cartão (opcional)

**Taxas:**
- Taxa percentual
- Taxa fixa em reais
- Permitir parcelamento (checkbox)
- Se permitir parcelamento:
  - Número máximo de parcelas
  - Valor mínimo por parcela
  - Taxas por número de parcelas (tabela editável)

**Ordenação:**
- Ordem de exibição (número)

---

## 5. Exemplos Práticos

### 5.1. Cadastrar PIX com Taxa de 1.5%

```bash
curl -X POST "https://api.fingestor.com/api/payment-methods" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "name": "PIX",
    "type": "pix",
    "feePercentage": 1.5,
    "displayOrder": 1
  }'
```

### 5.2. Cadastrar Cartão Visa Crédito com Parcelamento

```bash
curl -X POST "https://api.fingestor.com/api/payment-methods" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "name": "Cartão Visa Crédito",
    "type": "card",
    "cardType": "credit",
    "cardBrand": "Visa",
    "allowInstallments": true,
    "maxInstallments": 12,
    "minInstallmentAmount": 50,
    "installmentFees": {
      "1": 2.5,
      "2": 3.0,
      "3": 3.5,
      "4": 3.8,
      "5": 4.0,
      "6": 4.2,
      "7": 4.4,
      "8": 4.6,
      "9": 4.8,
      "10": 5.0,
      "11": 5.2,
      "12": 5.5
    },
    "displayOrder": 2
  }'
```

### 5.3. Calcular Taxa de Venda de R$ 5.000 em 6x no Visa

```bash
curl -X POST "https://api.fingestor.com/api/payment-methods/calculate-fee" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "paymentMethodId": "uuid-visa-credito",
    "amount": 5000.00,
    "installments": 6
  }'
```

**Resposta:**

```json
{
  "amount": 5000.00,
  "feeAmount": 210.00,
  "totalAmount": 5210.00,
  "feePercentage": 4.2,
  "feeFixedAmount": 0
}
```

Ou seja: R$ 5.000 parcelado em 6x no Visa com taxa de 4.2% = R$ 5.210 (6x de R$ 868,33)

---

## 6. Observações Importantes

1. **Forma Padrão**: Toda empresa deve ter **apenas uma** forma de pagamento como padrão. O backend garante isso automaticamente.

2. **Não Pode Excluir Padrão**: Não é possível excluir a forma de pagamento marcada como padrão. Primeiro defina outra como padrão.

3. **Dinheiro Automático**: Ao criar uma empresa, a forma de pagamento "Dinheiro" é criada automaticamente como padrão.

4. **Soft Delete**: A exclusão é lógica (soft delete). O registro não é removido do banco, apenas marcado como excluído.

5. **Taxas por Parcela**: Para cartões, você pode definir taxas diferentes para cada número de parcelas usando `installmentFees`. Isso é comum pois a operadora de cartão cobra taxas diferentes conforme o parcelamento.

6. **Display Order**: Use `display_order` para controlar a ordem de exibição das formas de pagamento no PDV.

7. **Metadados**: O campo `metadata` permite armazenar informações adicionais customizadas em formato JSON.
