# Correção de Variáveis - API de Orçamentos

## Deve ajustar as variáveis dos endpoints GET /api/budgets e GET /api/budgets/:id

As variáveis corretas retornadas pela API são:

### ❌ Variáveis INCORRETAS (remover da documentação):
- `budget_date` → não existe
- `valid_until` → não existe
- `total` → não existe
- `internal_notes` → não existe
- `phone` (em customers) → não existe

### ✅ Variáveis CORRETAS (usar na documentação):

#### Campos principais do orçamento:
- `issue_date` - Data de emissão do orçamento
- `expiry_date` - Data de validade do orçamento
- `total_amount` - Valor total do orçamento
- `subtotal` - Subtotal antes de descontos e impostos
- `discount_amount` - Valor do desconto
- `discount_percentage` - Percentual de desconto
- `tax_amount` - Valor de impostos
- `budget_number` - Número do orçamento (ex: ORC-2026-00001)

#### Campos de dados do cliente no orçamento:
- `customer_id` - UUID do cliente
- `customer_name` - Nome do cliente
- `customer_document` - CPF/CNPJ do cliente
- `customer_email` - Email do cliente
- `customer_phone` - Telefone do cliente

#### Campos de status e pipeline:
- `status` - Status do orçamento: draft, sent, approved, rejected, expired, converted, in_negotiation
- `pipeline_stage` - Estágio no pipeline: initial, sent, under_review, negotiating, final_review, approved, lost
- `win_probability` - Probabilidade de ganho (0-100)
- `rejection_reason` - Motivo da rejeição (texto livre)
- `loss_reason` - Motivo da perda: price, competitor, timing, budget, no_interest, other
- `days_in_pipeline` - Dias no pipeline

#### Campos de timestamps:
- `sent_at` - Data/hora de envio
- `approved_at` - Data/hora de aprovação
- `rejected_at` - Data/hora de rejeição
- `converted_at` - Data/hora de conversão em venda

#### Campos de follow-up:
- `last_followup_at` - Data/hora do último follow-up
- `next_followup_date` - Data do próximo follow-up
- `followup_count` - Contador de follow-ups

#### Campos adicionais:
- `notes` - Observações
- `terms` - Termos e condições
- `assigned_to` - UUID do usuário responsável
- `metadata` - Objeto JSON com dados customizados
- `created_by` - UUID do usuário que criou
- `created_at` - Data/hora de criação
- `updated_at` - Data/hora de atualização
- `deleted_at` - Data/hora de exclusão (soft delete)

### Campos dos itens do orçamento (budget_items):

#### ❌ Variáveis INCORRETAS:
- `subtotal` → não existe
- `total` → não existe
- `notes` → não existe

#### ✅ Variáveis CORRETAS:
- `id` - UUID do item
- `budget_id` - UUID do orçamento
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
- `total_amount` - Valor total do item
- `sort_order` - Ordem de exibição
- `created_at` - Data/hora de criação
- `updated_at` - Data/hora de atualização

### Relacionamento com customers:

No relacionamento `customers` retornado no orçamento, usar:
- `mobile` - Telefone celular (NÃO usar `phone`)
- `phone` - Telefone fixo
- `email` - Email
- `name` - Nome
- `document` - CPF/CNPJ
- `id` - UUID do cliente

## Exemplo de Response Correto:

```json
{
  "id": "uuid",
  "company_id": "uuid",
  "customer_id": "uuid",
  "budget_number": "ORC-2026-00001",
  "customer_name": "João Silva",
  "customer_document": "123.456.789-00",
  "customer_email": "joao@email.com",
  "customer_phone": "(11) 98765-4321",
  "issue_date": "2026-02-07",
  "expiry_date": "2026-02-22",
  "status": "sent",
  "pipeline_stage": "sent",
  "win_probability": 50,
  "subtotal": 5000.00,
  "discount_amount": 500.00,
  "discount_percentage": 10.00,
  "tax_amount": 0.00,
  "total_amount": 4500.00,
  "notes": "Observações",
  "terms": "Termos e condições",
  "rejection_reason": null,
  "loss_reason": null,
  "sent_at": "2026-02-07T14:00:00Z",
  "approved_at": null,
  "rejected_at": null,
  "converted_at": null,
  "last_followup_at": null,
  "next_followup_date": "2026-02-10",
  "followup_count": 0,
  "days_in_pipeline": 1,
  "assigned_to": "uuid-usuario",
  "metadata": {},
  "created_by": "uuid-usuario",
  "created_at": "2026-02-07T10:00:00Z",
  "updated_at": "2026-02-07T10:00:00Z",
  "deleted_at": null,
  "budget_items": [
    {
      "id": "uuid-item",
      "budget_id": "uuid-orcamento",
      "product_service_id": "uuid-produto",
      "item_type": "product",
      "sku": "CAM-001",
      "name": "Câmera IP 5MP",
      "description": "Câmera de segurança",
      "quantity": 2,
      "unit_price": 2500.00,
      "discount_amount": 0,
      "discount_percentage": 0,
      "tax_percentage": 0,
      "total_amount": 5000.00,
      "sort_order": 0,
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
