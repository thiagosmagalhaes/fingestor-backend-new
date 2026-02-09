# API de Criação de Vendas - Guia de Implementação Frontend

## Visão Geral

A API de criação de vendas foi atualizada para buscar automaticamente as informações do cliente a partir do `customerId`. O frontend **não precisa mais enviar** `customerName` e `customerDocument`, pois esses dados serão buscados automaticamente do banco de dados.

## Endpoint de Criação de Venda

### POST /api/sales

Cria uma nova venda no sistema.

### Request Body

```json
{
  "companyId": "uuid",
  "customerId": "uuid",
  "saleDate": "ISO 8601 string",
  "paymentMethodId": "uuid",
  "installmentsCount": 1,
  "items": [
    {
      "productServiceId": "uuid",
      "quantity": number,
      "unitPrice": number,
      "discountPercentage": number
    }
  ],
  "discountPercentage": number,
  "notes": "string"
}
```

### Campos Obrigatórios

- `companyId` (string): UUID da empresa
- `items` (array): Array com pelo menos 1 item

**Importante**: Se `customerId` for fornecido, os campos `customerName` e `customerDocument` serão **buscados automaticamente** do banco de dados e não devem ser enviados pelo frontend.

### Campos Opcionais

- `customerId` (string): UUID do cliente - quando fornecido, busca automaticamente nome e documento
- `budgetId` (string): UUID do orçamento relacionado
- `saleDate` (string): Data da venda no formato ISO 8601 (ex: "2026-02-08T17:43:16.642Z")
- `customerName` (string): Nome do cliente - **usar apenas quando não houver customerId**
- `customerDocument` (string): CPF/CNPJ do cliente - **usar apenas quando não houver customerId**
- `discountAmount` (number): Valor de desconto em reais
- `discountPercentage` (number): Percentual de desconto
- `taxAmount` (number): Valor de impostos
- `paymentMethod` (string): Forma de pagamento (string legada)
- `paymentMethodId` (string): UUID da forma de pagamento (preferido)
- `paymentStatus` (string): Status do pagamento - valores: 'pending', 'paid', 'partial'
- `paidAmount` (number): Valor pago
- `changeAmount` (number): Valor de troco
- `notes` (string): Observações da venda
- `installmentsCount` (number): Número de parcelas (padrão: 1)

### Estrutura de Item

Cada item no array `items` deve conter:

**Obrigatórios**:
- `productServiceId` (string): UUID do produto/serviço - todas as informações serão buscadas automaticamente
- `quantity` (number): Quantidade
- `unitPrice` (number): Preço unitário

**Opcionais**:
- `discountAmount` (number): Desconto em reais no item
- `discountPercentage` (number): Percentual de desconto no item
- `name` (string): Nome customizado (sobrescreve o nome do produto)
- `sku` (string): SKU customizado
- `description` (string): Descrição customizada
- `taxPercentage` (number): Percentual de imposto
- `costPrice` (number): Preço de custo
- `sortOrder` (number): Ordem de exibição

## Exemplo de Requisição

### Com Cliente Cadastrado (Recomendado)

```bash
curl -X POST https://api.exemplo.com/api/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "companyId": "851600bc-59c9-497c-b855-2c00bcc894c5",
    "customerId": "91d97330-cedf-45dc-b1d4-18d4ac14864d",
    "saleDate": "2026-02-08T17:43:16.642Z",
    "paymentMethodId": "88ab5857-7e65-4e74-9769-cd89fdcb793c",
    "installmentsCount": 1,
    "items": [
      {
        "productServiceId": "d56705a5-b3c6-4ebd-ae3f-175ac5893701",
        "quantity": 1,
        "unitPrice": 89.9,
        "discountPercentage": 0
      }
    ],
    "discountPercentage": 0,
    "notes": ""
  }'
```

### Sem Cliente Cadastrado (Venda Avulsa)

```bash
curl -X POST https://api.exemplo.com/api/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "companyId": "851600bc-59c9-497c-b855-2c00bcc894c5",
    "customerName": "João da Silva",
    "customerDocument": "123.456.789-00",
    "saleDate": "2026-02-08T17:43:16.642Z",
    "paymentMethodId": "88ab5857-7e65-4e74-9769-cd89fdcb793c",
    "items": [
      {
        "productServiceId": "d56705a5-b3c6-4ebd-ae3f-175ac5893701",
        "quantity": 2,
        "unitPrice": 89.9
      }
    ],
    "notes": "Venda avulsa"
  }'
```

### Com Parcelas

```bash
curl -X POST https://api.exemplo.com/api/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "companyId": "851600bc-59c9-497c-b855-2c00bcc894c5",
    "customerId": "91d97330-cedf-45dc-b1d4-18d4ac14864d",
    "paymentMethodId": "88ab5857-7e65-4e74-9769-cd89fdcb793c",
    "installmentsCount": 3,
    "items": [
      {
        "productServiceId": "d56705a5-b3c6-4ebd-ae3f-175ac5893701",
        "quantity": 1,
        "unitPrice": 300.00
      }
    ]
  }'
```

## Respostas Possíveis

### Sucesso (201 Created)

```json
{
  "id": "uuid",
  "company_id": "uuid",
  "customer_id": "uuid",
  "budget_id": null,
  "sale_number": "2026-0001",
  "customer_name": "João da Silva",
  "customer_document": "123.456.789-00",
  "subtotal": 89.90,
  "discount_amount": 0,
  "discount_percentage": 0,
  "tax_amount": 0,
  "total_amount": 89.90,
  "payment_method": "card",
  "payment_method_id": "uuid",
  "payment_status": "pending",
  "paid_amount": 0,
  "change_amount": 0,
  "status": "completed",
  "sale_date": "2026-02-08T17:43:16.642Z",
  "notes": "",
  "created_at": "2026-02-08T17:43:16.642Z",
  "updated_at": "2026-02-08T17:43:16.642Z",
  "sale_items": [
    {
      "id": "uuid",
      "sale_id": "uuid",
      "product_service_id": "uuid",
      "item_type": "product",
      "sku": "PROD-001",
      "name": "Produto Exemplo",
      "quantity": 1,
      "unit_price": 89.90,
      "discount_amount": 0,
      "discount_percentage": 0,
      "tax_percentage": 0,
      "total_amount": 89.90,
      "sort_order": 0
    }
  ],
  "payment_installments": []
}
```

### Sucesso com Parcelas (201 Created)

```json
{
  "id": "uuid",
  "sale_number": "2026-0001",
  "total_amount": 300.00,
  "payment_installments": [
    {
      "id": "uuid",
      "sale_id": "uuid",
      "installment_number": 1,
      "amount": 100.00,
      "due_date": "2026-02-08",
      "status": "pending",
      "payment_method_id": "uuid"
    },
    {
      "id": "uuid",
      "sale_id": "uuid",
      "installment_number": 2,
      "amount": 100.00,
      "due_date": "2026-03-08",
      "status": "pending",
      "payment_method_id": "uuid"
    },
    {
      "id": "uuid",
      "sale_id": "uuid",
      "installment_number": 3,
      "amount": 100.00,
      "due_date": "2026-04-08",
      "status": "pending",
      "payment_method_id": "uuid"
    }
  ]
}
```

### Erro - Cliente Não Encontrado (400 Bad Request)

```json
{
  "error": "Cliente não encontrado"
}
```

### Erro - Campos Obrigatórios (400 Bad Request)

```json
{
  "error": "companyId e items são obrigatórios"
}
```

### Erro - Produto Não Encontrado (500 Internal Server Error)

```json
{
  "error": "Erro ao criar venda"
}
```

## Regras de Negócio Frontend

### Busca Automática de Dados do Cliente

1. **Quando o cliente está cadastrado**: 
   - Envie apenas o `customerId`
   - O backend buscará automaticamente `name` e `document` do banco
   - Não envie `customerName` e `customerDocument`

2. **Quando o cliente não está cadastrado** (venda avulsa):
   - Não envie `customerId`
   - Envie manualmente `customerName` e `customerDocument`

### Data da Venda

- Se `saleDate` não for enviado, o backend usará a data/hora atual do servidor
- Se enviado, deve estar no formato ISO 8601: `"2026-02-08T17:43:16.642Z"`

### Parcelas

- Se `installmentsCount` não for enviado ou for 1, não cria parcelas
- Se `installmentsCount` for maior que 1, cria as parcelas automaticamente:
  - Valor dividido igualmente entre as parcelas
  - Vencimento: primeira parcela na data atual, demais a cada 30 dias
  - `payment_method` e `payment_method_id` são replicados para todas as parcelas

### Produtos e Serviços

- Ao enviar apenas `productServiceId`, o backend busca automaticamente:
  - `name` (nome)
  - `sku` (código)
  - `item_type` (tipo: product ou service)
  - `description` (descrição)
  - `tax_percentage` (percentual de imposto)
  - `cost_price` (preço de custo)
- Você pode sobrescrever qualquer um desses campos enviando-os no item

### Cálculo de Totais

- O backend calcula automaticamente `subtotal` e `total_amount` baseado nos itens
- Descontos podem ser aplicados:
  - Por item: `discountAmount` ou `discountPercentage` no item
  - Na venda total: `discountAmount` ou `discountPercentage` na venda

### Status e Validações

- `payment_status` padrão: `'pending'`
- `status` padrão: `'completed'`
- Todos os valores monetários devem ser números positivos
- `quantity` deve ser maior que 0

## Fluxo de Implementação Recomendado

1. **Seleção de Cliente**:
   - Se cliente existente selecionado → Use `customerId` apenas
   - Se cliente novo ou venda rápida → Use `customerName` e `customerDocument`

2. **Adição de Produtos**:
   - Busque produtos do catálogo e use `productServiceId`
   - Permita ajuste de `unitPrice` se necessário
   - Permita aplicar descontos por item

3. **Forma de Pagamento**:
   - Use `paymentMethodId` (UUID) - preferido
   - Se não tiver cadastro de formas, use `paymentMethod` (string)

4. **Parcelas**:
   - Se pagamento permitir, pergunte quantidade de parcelas
   - Envie em `installmentsCount`

5. **Finalização**:
   - Envie `saleDate` com a data/hora atual do dispositivo
   - Inclua `notes` se houver observações
   - Após sucesso, exiba número da venda e detalhes das parcelas (se houver)

## Tratamento de Erros

O frontend deve tratar os seguintes cenários:

- **400**: Dados inválidos ou cliente não encontrado - exibir mensagem de erro específica
- **500**: Erro interno - tentar novamente ou contatar suporte
- **401**: Não autenticado - redirecionar para login
- **403**: Sem permissão - exibir mensagem apropriada

## Observações Importantes

- **Sempre envie o token de autenticação** no header `Authorization`
- **Validade dos dados**: Certifique-se que `companyId`, `customerId` e `productServiceId` são UUIDs válidos
- **Sincronização**: Após criar venda com sucesso, atualize o estoque local se estiver usando cache
- **Logs**: Implemente logs de requisições para facilitar debug de problemas em produção
