# Correção de Variáveis - API de PDV (Vendas)

## Deve ajustar as variáveis dos endpoints GET /api/sales e GET /api/sales/:id

As variáveis corretas retornadas pela API são:

### ❌ Variáveis INCORRETAS (remover da documentação):
- `total` → não existe
- `amount_paid` → não existe
- `phone` (em customers) → não existe
- Status com valores errados: `pending_payment`, `partial_payment`
- `installments_count` → não existe

### ✅ Variáveis CORRETAS (usar na documentação):

#### Campos principais da venda:
- `total_amount` - Valor total da venda (não `total`)
- `paid_amount` - Valor já pago (não `amount_paid`)
- `change_amount` - Valor do troco
- `subtotal` - Subtotal antes de descontos e impostos
- `discount_amount` - Valor do desconto
- `discount_percentage` - Percentual de desconto
- `tax_amount` - Valor de impostos
- `sale_number` - Número da venda (ex: VEN-2026-00001)
- `sale_date` - Data/hora da venda

#### Campos de dados do cliente na venda:
- `customer_id` - UUID do cliente
- `customer_name` - Nome do cliente
- `customer_document` - CPF/CNPJ do cliente
- `budget_id` - UUID do orçamento (se convertido)

#### Campos de status:
**IMPORTANTE:** Existem 2 campos de status diferentes:

1. **`status`** - Status geral da venda:
   - `draft` - Rascunho
   - `completed` - Venda concluída
   - `cancelled` - Cancelada
   - `refunded` - Reembolsada

2. **`payment_status`** - Status do pagamento:
   - `pending` - Pagamento pendente
   - `paid` - Totalmente pago
   - `partial` - Pagamento parcial
   - `cancelled` - Pagamento cancelado
   - `refunded` - Reembolsado

#### Campos de pagamento:
- `payment_method` - Método de pagamento (money, credit_card, debit_card, pix, bank_transfer, check, other)

#### Campos de timestamps:
- `cancelled_at` - Data/hora do cancelamento
- `refunded_at` - Data/hora do reembolso
- `created_at` - Data/hora de criação
- `updated_at` - Data/hora de atualização
- `deleted_at` - Data/hora de exclusão (soft delete)

#### Campos adicionais:
- `notes` - Observações
- `cancellation_reason` - Motivo do cancelamento
- `nfce_number` - Número da NFC-e
- `nfce_key` - Chave da NFC-e
- `nfce_status` - Status da NFC-e
- `metadata` - Objeto JSON com dados customizados
- `created_by` - UUID do usuário que criou

### Campos dos itens de venda (sale_items):

#### ❌ Variáveis INCORRETAS:
- `subtotal` → não existe
- `total` → não existe
- `notes` → não existe

#### ✅ Variáveis CORRETAS:
- `id` - UUID do item
- `sale_id` - UUID da venda
- `product_service_id` - UUID do produto/serviço
- `item_type` - Tipo: product ou service
- `sku` - Código SKU
- `name` - Nome do produto/serviço
- `description` - Descrição
- `quantity` - Quantidade
- `unit_price` - Preço unitário
- `discount_amount` - Valor do desconto
- `discount_percentage` - Percentual de desconto
- `tax_percentage` - Percentual de imposto
- `total_amount` - Valor total do item (NÃO `total` ou `subtotal`)
- `cost_price` - Preço de custo
- `sort_order` - Ordem de exibição
- `created_at` - Data/hora de criação
- `updated_at` - Data/hora de atualização

### Campos das parcelas (payment_installments):

#### ✅ Variáveis CORRETAS:
- `id` - UUID da parcela
- `sale_id` - UUID da venda
- `installment_number` - Número da parcela (1, 2, 3...)
- `amount` - Valor da parcela
- `paid_amount` - Valor já pago
- `due_date` - Data de vencimento (DATE, não TIMESTAMPTZ)
- `paid_at` - Data/hora do pagamento
- `status` - Status: pending, paid, overdue, cancelled
- `payment_method` - Método de pagamento
- `notes` - Observações
- `created_at` - Data/hora de criação
- `updated_at` - Data/hora de atualização

### Relacionamento com customers:

No relacionamento `customers` retornado na venda, usar:
- `mobile` - Telefone celular (NÃO usar `phone`)
- `phone` - Telefone fixo (existe mas não é mostrado por padrão)
- `email` - Email
- `name` - Nome
- `document` - CPF/CNPJ
- `id` - UUID do cliente

## Query Parameters Corretos:

### GET /api/sales
- `companyId` (obrigatório)
- `status` (opcional): draft, completed, cancelled, refunded
- `paymentStatus` (opcional): pending, paid, partial, cancelled, refunded
- `from` (opcional): Data inicial
- `to` (opcional): Data final

**NOTA:** O parâmetro correto é `paymentStatus` (não `paymentMethod` para filtro)

## Exemplo de Response Correto - Lista de Vendas:

```json
[
  {
    "id": "uuid-venda",
    "company_id": "uuid-da-empresa",
    "customer_id": "uuid-cliente",
    "budget_id": null,
    "sale_number": "VEN-2026-00001",
    "customer_name": "João Silva",
    "customer_document": "123.456.789-00",
    "sale_date": "2026-02-07T10:00:00Z",
    "status": "completed",
    "payment_status": "paid",
    "payment_method": "credit_card",
    "subtotal": 4500.00,
    "discount_percentage": 5.00,
    "discount_amount": 225.00,
    "tax_amount": 0.00,
    "total_amount": 4275.00,
    "paid_amount": 4275.00,
    "change_amount": 0.00,
    "notes": "Venda realizada na loja",
    "cancellation_reason": null,
    "cancelled_at": null,
    "refunded_at": null,
    "nfce_number": null,
    "nfce_key": null,
    "nfce_status": null,
    "metadata": {},
    "created_by": "uuid-usuario",
    "created_at": "2026-02-07T10:00:00Z",
    "updated_at": "2026-02-07T10:00:00Z",
    "deleted_at": null,
    "customers": {
      "id": "uuid-cliente",
      "name": "João Silva",
      "email": "joao@email.com",
      "mobile": "(11) 98765-4321"
    }
  }
]
```

## Exemplo de Response Correto - Venda Completa (com itens e parcelas):

```json
{
  "id": "uuid-venda",
  "company_id": "uuid-da-empresa",
  "customer_id": "uuid-cliente",
  "budget_id": null,
  "sale_number": "VEN-2026-00001",
  "customer_name": "João Silva",
  "customer_document": "123.456.789-00",
  "sale_date": "2026-02-07T10:00:00Z",
  "status": "completed",
  "payment_status": "partial",
  "payment_method": "credit_card",
  "subtotal": 4500.00,
  "discount_percentage": 5.00,
  "discount_amount": 225.00,
  "tax_amount": 0.00,
  "total_amount": 4275.00,
  "paid_amount": 1425.00,
  "change_amount": 0.00,
  "notes": "Venda parcelada em 3x",
  "cancellation_reason": null,
  "cancelled_at": null,
  "refunded_at": null,
  "nfce_number": null,
  "nfce_key": null,
  "nfce_status": null,
  "metadata": {},
  "created_by": "uuid-usuario",
  "created_at": "2026-02-07T10:00:00Z",
  "updated_at": "2026-02-07T10:00:00Z",
  "deleted_at": null,
  "sale_items": [
    {
      "id": "uuid-item",
      "sale_id": "uuid-venda",
      "product_service_id": "uuid-produto",
      "item_type": "product",
      "sku": "CAM-001",
      "name": "Câmera IP 5MP",
      "description": "Câmera de segurança IP",
      "quantity": 2,
      "unit_price": 2250.00,
      "discount_percentage": 0,
      "discount_amount": 0,
      "tax_percentage": 0,
      "total_amount": 4500.00,
      "cost_price": 1800.00,
      "sort_order": 0,
      "created_at": "2026-02-07T10:00:00Z",
      "updated_at": "2026-02-07T10:00:00Z",
      "products_services": {
        "id": "uuid-produto",
        "name": "Câmera IP 5MP",
        "current_stock": 23
      }
    }
  ],
  "payment_installments": [
    {
      "id": "uuid-parcela-1",
      "sale_id": "uuid-venda",
      "installment_number": 1,
      "amount": 1425.00,
      "paid_amount": 1425.00,
      "due_date": "2026-02-07",
      "paid_at": "2026-02-07T10:05:00Z",
      "status": "paid",
      "payment_method": "credit_card",
      "notes": "Primeira parcela paga na venda",
      "created_at": "2026-02-07T10:00:00Z",
      "updated_at": "2026-02-07T10:05:00Z"
    },
    {
      "id": "uuid-parcela-2",
      "sale_id": "uuid-venda",
      "installment_number": 2,
      "amount": 1425.00,
      "paid_amount": 0.00,
      "due_date": "2026-03-07",
      "paid_at": null,
      "status": "pending",
      "payment_method": null,
      "notes": null,
      "created_at": "2026-02-07T10:00:00Z",
      "updated_at": "2026-02-07T10:00:00Z"
    },
    {
      "id": "uuid-parcela-3",
      "sale_id": "uuid-venda",
      "installment_number": 3,
      "amount": 1425.00,
      "paid_amount": 0.00,
      "due_date": "2026-04-07",
      "paid_at": null,
      "status": "pending",
      "payment_method": null,
      "notes": null,
      "created_at": "2026-02-07T10:00:00Z",
      "updated_at": "2026-02-07T10:00:00Z"
    }
  ],
  "customers": {
    "id": "uuid-cliente",
    "name": "João Silva",
    "email": "joao@email.com",
    "mobile": "(11) 98765-4321",
    "document": "123.456.789-00"
  }
}
```

## Diferenças Importantes:

### Status vs Payment Status
- **`status`**: Estado geral da venda (draft, completed, cancelled, refunded)
- **`payment_status`**: Estado do pagamento (pending, paid, partial, cancelled, refunded)

Uma venda pode estar `status: completed` mas com `payment_status: partial` (venda finalizada mas com pagamento parcial).

### Parcelas
- O campo `due_date` é do tipo DATE (apenas data, sem hora): "2026-02-07"
- O campo `paid_at` é TIMESTAMPTZ (data e hora): "2026-02-07T10:05:00Z"

### Relacionamento com Customers
- Sempre usar `mobile` ao invés de `phone` na resposta padrão
- O campo `phone` existe na tabela customers mas não é retornado por padrão no select
