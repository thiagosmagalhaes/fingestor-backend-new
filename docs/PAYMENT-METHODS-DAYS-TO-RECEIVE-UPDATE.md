# Atualização: Dias para Recebimento em Métodos de Pagamento

## O que mudou?

Foi adicionado um novo campo `days_to_receive` (dias para recebimento) na tabela de métodos de pagamento (`payment_methods`). Este campo indica **em quantos dias o valor da venda será recebido** ao utilizar aquele método de pagamento específico.

## Por que isso foi adicionado?

Em negócios físicos, diferentes formas de pagamento têm diferentes prazos de recebimento:
- **Dinheiro**: recebimento imediato (0 dias)
- **PIX**: recebimento imediato (0 dias)  
- **Cartão de Débito**: geralmente D+1 (1 dia útil)
- **Cartão de Crédito**: geralmente D+30 (30 dias)

Este campo permite que o sistema controle o fluxo de caixa de forma mais precisa, sabendo exatamente quando o valor de cada venda estará disponível.

---

## Endpoint afetado

### GET /api/payment-methods

**Endpoint para listar métodos de pagamento**

#### Requisição
```
GET /api/payment-methods?companyId={company_id}
Authorization: Bearer {token}
```

#### Resposta - O que mudou
Agora o retorno inclui o campo `days_to_receive`:

```json
[
  {
    "id": "uuid",
    "company_id": "uuid",
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
    "days_to_receive": 0,  // ← NOVO CAMPO
    "display_order": 0,
    "metadata": {},
    "created_at": "2026-02-08T18:23:16Z",
    "updated_at": "2026-02-08T18:23:16Z",
    "deleted_at": null
  },
  {
    "id": "uuid",
    "company_id": "uuid",
    "name": "Cartão Débito Visa",
    "type": "card",
    "card_type": "debit",
    "card_brand": "Visa",
    "fee_percentage": 2.5,
    "fee_fixed_amount": 0,
    "installment_fees": {},
    "is_active": true,
    "is_default": false,
    "allow_installments": false,
    "max_installments": 1,
    "min_installment_amount": 0,
    "days_to_receive": 1,  // ← NOVO CAMPO (D+1)
    "display_order": 1,
    "metadata": {},
    "created_at": "2026-02-08T18:23:16Z",
    "updated_at": "2026-02-08T18:23:16Z",
    "deleted_at": null
  },
  {
    "id": "uuid",
    "company_id": "uuid",
    "name": "Cartão Crédito Mastercard",
    "type": "card",
    "card_type": "credit",
    "card_brand": "Mastercard",
    "fee_percentage": 3.5,
    "fee_fixed_amount": 0,
    "installment_fees": {
      "1": 3.5,
      "2": 4.0,
      "3": 4.5
    },
    "is_active": true,
    "is_default": false,
    "allow_installments": true,
    "max_installments": 12,
    "min_installment_amount": 10,
    "days_to_receive": 30,  // ← NOVO CAMPO (D+30)
    "display_order": 2,
    "metadata": {},
    "created_at": "2026-02-08T18:23:16Z",
    "updated_at": "2026-02-08T18:23:16Z",
    "deleted_at": null
  }
]
```

---

### POST /api/payment-methods

**Endpoint para criar novo método de pagamento**

#### Requisição - O que mudou
Agora é possível enviar o campo `daysToReceive` (opcional):

```
POST /api/payment-methods
Authorization: Bearer {token}
Content-Type: application/json

{
  "companyId": "uuid",
  "name": "PIX",
  "type": "pix",
  "feePercentage": 0,
  "feeFixedAmount": 0,
  "isActive": true,
  "isDefault": false,
  "daysToReceive": 0,  // ← NOVO CAMPO (opcional, padrão: 0)
  "displayOrder": 3
}
```

**Valores sugeridos para `daysToReceive`:**
- `0` - Dinheiro, PIX (recebimento imediato)
- `1` - Cartão de Débito (D+1)
- `30` - Cartão de Crédito (D+30)
- Outros valores conforme necessidade do negócio

#### Resposta
```json
{
  "id": "uuid",
  "company_id": "uuid",
  "name": "PIX",
  "type": "pix",
  "card_type": null,
  "card_brand": null,
  "fee_percentage": 0,
  "fee_fixed_amount": 0,
  "installment_fees": {},
  "is_active": true,
  "is_default": false,
  "allow_installments": false,
  "max_installments": 1,
  "min_installment_amount": 0,
  "days_to_receive": 0,  // ← NOVO CAMPO retornado
  "display_order": 3,
  "metadata": {},
  "created_at": "2026-02-08T18:23:16Z",
  "updated_at": "2026-02-08T18:23:16Z",
  "deleted_at": null
}
```

---

### PUT /api/payment-methods/:id

**Endpoint para atualizar método de pagamento**

#### Requisição - O que mudou
Agora é possível enviar o campo `daysToReceive` (opcional):

```
PUT /api/payment-methods/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "companyId": "uuid",
  "name": "Cartão Débito Visa",
  "daysToReceive": 2,  // ← NOVO CAMPO (opcional)
  "feePercentage": 2.75
}
```

#### Resposta
Retorna o método de pagamento atualizado com o novo valor de `days_to_receive`.

---

## O que o Frontend deve ajustar?

### 1. **Interface TypeScript/JavaScript**

Adicione o campo `daysToReceive` no tipo de dados:

```typescript
interface PaymentMethod {
  id: string;
  company_id: string;
  name: string;
  type: 'cash' | 'pix' | 'card' | 'other';
  card_type?: 'debit' | 'credit' | 'both';
  card_brand?: string;
  fee_percentage: number;
  fee_fixed_amount: number;
  installment_fees: Record<string, number>;
  is_active: boolean;
  is_default: boolean;
  allow_installments: boolean;
  max_installments: number;
  min_installment_amount: number;
  days_to_receive: number;  // ← ADICIONAR
  display_order: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
```

### 2. **Formulário de Criação/Edição de Método de Pagamento**

Adicione um campo numérico para o usuário informar os dias de recebimento:

**Sugestões de UI:**
- **Input numérico** com label "Dias para recebimento" ou "Prazo de recebimento (dias)"
- **Valor padrão**: 0 (recebimento imediato)
- **Placeholder**: "0" ou "Ex: 0 para imediato, 1 para D+1, 30 para D+30"
- **Tooltip explicativo**: "Informe em quantos dias o valor será recebido após a venda"

**Exemplo de implementação:**
```jsx
<FormField>
  <Label>Dias para Recebimento</Label>
  <Input 
    type="number" 
    name="daysToReceive"
    placeholder="0"
    defaultValue={0}
    min={0}
    max={365}
  />
  <HelpText>
    Dias úteis até o recebimento (0 = imediato)
  </HelpText>
</FormField>
```

### 3. **Exibição na Lista de Métodos de Pagamento**

Mostre o prazo de recebimento na listagem para facilitar identificação:

**Sugestões de formatação:**
- `0 dias` → "Imediato" ou "D+0"
- `1 dia` → "D+1"
- `30 dias` → "D+30"

**Exemplo:**
```jsx
<PaymentMethodCard>
  <h3>{method.name}</h3>
  <Badge>{method.type}</Badge>
  <Text>
    Recebimento: {method.days_to_receive === 0 
      ? 'Imediato' 
      : `D+${method.days_to_receive}`}
  </Text>
</PaymentMethodCard>
```

### 4. **Tela de Vendas/PDV**

Ao selecionar um método de pagamento durante a venda, considere mostrar o prazo de recebimento:

**Exemplo:**
```jsx
<PaymentMethodOption selected={isSelected}>
  <div>
    <strong>{method.name}</strong>
    <small>Recebimento em {method.days_to_receive} dia(s)</small>
  </div>
</PaymentMethodOption>
```

### 5. **Relatórios de Fluxo de Caixa (Futuro)**

Este campo será essencial para relatórios financeiros que mostram:
- Quando o dinheiro de cada venda estará disponível
- Projeção de recebimentos futuros
- Análise de fluxo de caixa por método de pagamento

---

## Valores padrões aplicados automaticamente

Quando a migration foi executada, valores padrão foram aplicados aos métodos existentes:

- **Tipo `cash` (Dinheiro)**: `days_to_receive = 0`
- **Tipo `pix`**: `days_to_receive = 0`
- **Tipo `card` + `card_type = 'debit'`**: `days_to_receive = 1`
- **Tipo `card` + `card_type = 'credit'`**: `days_to_receive = 30`
- **Tipo `other`**: `days_to_receive = 0`

O usuário pode editar esses valores conforme a realidade do negócio dele.

---

## Exemplo completo de uso

### Criando um método de pagamento com prazo de recebimento

```bash
curl -X POST https://api.seudominio.com/api/payment-methods \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Cartão Crédito Visa",
    "type": "card",
    "cardType": "credit",
    "cardBrand": "Visa",
    "feePercentage": 3.99,
    "allowInstallments": true,
    "maxInstallments": 12,
    "minInstallmentAmount": 10,
    "daysToReceive": 30,
    "isActive": true,
    "displayOrder": 5
  }'
```

### Resposta
```json
{
  "id": "987fcdeb-51f2-43d1-89ab-426614174abc",
  "company_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Cartão Crédito Visa",
  "type": "card",
  "card_type": "credit",
  "card_brand": "Visa",
  "fee_percentage": 3.99,
  "fee_fixed_amount": 0,
  "installment_fees": {},
  "is_active": true,
  "is_default": false,
  "allow_installments": true,
  "max_installments": 12,
  "min_installment_amount": 10,
  "days_to_receive": 30,
  "display_order": 5,
  "metadata": {},
  "created_at": "2026-02-08T18:30:00Z",
  "updated_at": "2026-02-08T18:30:00Z",
  "deleted_at": null
}
```

---

## Resumo das mudanças

✅ **Novo campo**: `days_to_receive` (INTEGER, NOT NULL, padrão: 0)  
✅ **Retornado em**: GET, POST, PUT de `/api/payment-methods`  
✅ **Pode ser enviado em**: POST e PUT (opcional)  
✅ **Valores automáticos aplicados** aos métodos existentes baseado no tipo  

---

## Precisa de ajuda?

Se tiver dúvidas sobre como implementar essa feature no frontend, consulte a documentação completa da API de Métodos de Pagamento ou entre em contato com a equipe de backend.
