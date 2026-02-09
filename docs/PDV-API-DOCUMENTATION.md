# Documentação de API - Sistema PDV (Ponto de Venda)

## Visão Geral

Esta documentação descreve os endpoints disponíveis para gerenciar vendas diretas (PDV), pagamentos parcelados e conversão de orçamentos em vendas.

## Integração com Formas de Pagamento

O sistema PDV está integrado com o sistema de **Formas de Pagamento Customizáveis**. Cada empresa pode cadastrar suas próprias formas de pagamento com taxas específicas.

**Campos Relacionados:**
- `payment_method` (string, opcional): Nome da forma de pagamento (mantido por compatibilidade)
- `payment_method_id` (UUID, opcional): ID da forma de pagamento cadastrada (preferido)

**Recomendação:** Use `payment_method_id` sempre que possível, pois permite:
- Rastreamento preciso da forma de pagamento utilizada
- Aplicação automática de taxas
- Relatórios mais detalhados
- Validação de parcelamento

Para cadastrar e gerenciar formas de pagamento, consulte: [PAYMENT-METHODS-API-DOCUMENTATION.md](docs/PAYMENT-METHODS-API-DOCUMENTATION.md)

## Autenticação

Todos os endpoints requerem autenticação via token Bearer:

```
Authorization: Bearer {seu_access_token}
```

---

## 1. Vendas (PDV)

### 1.1. Listar Vendas

**Endpoint:** `GET /api/sales`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa
- `customerId` (opcional): UUID do cliente
- `status` (opcional): `draft`, `completed`, `cancelled`, `refunded`
- `paymentStatus` (opcional): `pending`, `paid`, `partial`, `cancelled`, `refunded`
- `from` (opcional): Data inicial
- `to` (opcional): Data final

**Exemplo de Requisição:**

```bash
curl -X GET "https://api.fingestor.com/api/sales?companyId=uuid-da-empresa&status=completed&paymentStatus=paid&from=2026-02-01&to=2026-02-07" \
  -H "Authorization: Bearer seu_token"
```

**Resposta de Sucesso (200):**

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
    "payment_method": "Cartão Visa Crédito",
    "payment_method_id": "uuid-visa-credito",
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

### 1.2. Obter Venda Completa (com itens e parcelas)

**Endpoint:** `GET /api/sales/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Resposta de Sucesso (200):**

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

### 1.3. Criar Venda

**Endpoint:** `POST /api/sales`

**Body:**

```json
{
  "companyId": "uuid-da-empresa",
  "customerId": "uuid-cliente",
  "customerName": "João Silva",
  "customerDocument": "123.456.789-00",
  "paymentMethodId": "uuid-forma-pagamento",
  "paymentStatus": "paid",
  "paidAmount": 4275.00,
  "changeAmount": 0,
  "installments": 3,
  "items": [
    {
      "productServiceId": "uuid-produto",
      "quantity": 2,
      "unitPrice": 2250.00,
      "discountPercentage": 0
    }
  ],
  "discountPercentage": 5.00,
  "notes": "Venda parcelada em 3x"
}
```

**Campos Obrigatórios:**
- `companyId`: UUID da empresa
- `items`: Array de itens (mínimo 1 item)

**Campos de Forma de Pagamento:**
- `paymentMethodId` (UUID, recomendado): ID da forma de pagamento cadastrada
- `paymentMethod` (string, alternativa): Nome da forma de pagamento (para compatibilidade)

**Nota:** Sempre que possível, use `paymentMethodId` em vez de `paymentMethod`. Isso permite:
1. Aplicação automática de taxas configuradas
2. Validação de parcelamento (max_installments)
3. Validação de valor mínimo por parcela
4. Relatórios mais precisos
- `paymentMethod`
- `items` (array com pelo menos 1 item)
  - Cada item precisa: `productServiceId`, `quantity`, `unitPrice`

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/sales" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid-da-empresa",
    "customerId": "uuid-cliente",
    "saleDate": "2026-02-07T10:00:00Z",
    "paymentMethod": "credit_card",
    "installmentsCount": 3,
    "items": [
      {
        "productServiceId": "uuid-produto",
        "quantity": 2,
        "unitPrice": 2250.00
      }
    ]
  }'
```

**Resposta de Sucesso (201):** Retorna a venda criada com número gerado automaticamente

**Notas:**
- O `sale_number` é gerado automaticamente no formato `VEN-YYYY-NNNNN`
- Os totais são calculados automaticamente via trigger
- Status inicial é `completed` e `payment_status` é `pending` se houver parcelas, `paid` se à vista
- **Estoque é baixado automaticamente** via trigger para produtos
- Se `installmentsCount > 1`, parcelas são criadas automaticamente

**Erros Possíveis:**
- `400`: Produto não encontrado ou não controla estoque
- `400`: Estoque insuficiente para venda
- `400`: Dados obrigatórios não fornecidos

### 1.4. Atualizar Venda

**Endpoint:** `PUT /api/sales/:id`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Body:**

```json
{
  "notes": "Adicionado desconto especial",
  "discountPercentage": 10.00
}
```

**Notas:**
- Apenas vendas com `status = draft` podem ser editadas
- Não é possível editar itens de vendas já finalizadas (`status = completed`)
- Para alterar pagamentos, use o endpoint específico de parcelas

### 1.5. Cancelar Venda

**Endpoint:** `POST /api/sales/:id/cancel`

**Query Parameters:**
- `companyId` (obrigatório): UUID da empresa

**Body (opcional):**

```json
{
  "reason": "Cliente solicitou cancelamento"
}
```

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/sales/uuid-venda/cancel?companyId=uuid-da-empresa" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Cliente solicitou cancelamento"
  }'
```

**Resposta de Sucesso (200):**

```json
{
  "message": "Venda cancelada com sucesso"
}
```

**Notas:**
- **Estoque é devolvido automaticamente** via função do banco
- Status da venda muda para `cancelled`
- Todas as parcelas pendentes são canceladas
- Parcelas já pagas não são afetadas (reembolso deve ser manual)

---

## 2. Conversão de Orçamento em Venda

### 2.1. Converter Orçamento em Venda

**Endpoint:** `POST /api/sales/convert-budget`

**Body:**

```json
{
  "budgetId": "uuid-orcamento",
  "paymentMethodId": "uuid-forma-pagamento",
  "installments": 3,
  "notes": "Venda convertida do orçamento ORC-2026-00001"
}
```

**Campos Obrigatórios:**
- `budgetId`: UUID do orçamento

**Campos de Forma de Pagamento:**
- `paymentMethodId` (UUID, recomendado): ID da forma de pagamento cadastrada
- `paymentMethod` (string, alternativa): Nome da forma de pagamento (para compatibilidade)

**Campos Opcionais:**
- `installments`: Número de parcelas (padrão: 1)
- `notes`: Observações

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/sales/convert-budget" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetId": "uuid-orcamento",
    "paymentMethodId": "uuid-cartao-credito",
    "installments": 3
  }'
```

**Resposta de Sucesso (201):**

```json
{
  "id": "uuid-venda",
  "company_id": "uuid-da-empresa",
  "customer_id": "uuid-cliente",
  "budget_id": "uuid-orcamento",
  "sale_number": "VEN-2026-00002",
  "sale_date": "2026-02-07T10:00:00Z",
  "status": "completed",
  "payment_status": "pending",
  "payment_method": "Cartão Visa Crédito",
  "payment_method_id": "uuid-cartao-credito",
  "total_amount": 4500.00,
  "paid_amount": 0.00,
  "sale_items": [...],
  "payment_installments": [
    {
      "installment_number": 1,
      "amount": 1500.00,
      "due_date": "2026-02-07",
      "status": "pending"
    },
    {
      "installment_number": 2,
      "amount": 1500.00,
      "due_date": "2026-03-07",
      "status": "pending"
    },
    {
      "installment_number": 3,
      "amount": 1500.00,
      "due_date": "2026-04-07",
      "status": "pending"
    }
  ]
}
```

**Notas:**
- Orçamento precisa estar com `status = approved`
- Todos os itens do orçamento são copiados para a venda
- Descontos são mantidos
- Status do orçamento muda para `converted`
- **Estoque é baixado automaticamente**

**Erros Possíveis:**
- `400`: Orçamento não encontrado
- `400`: Orçamento não está aprovado
- `400`: Estoque insuficiente para algum produto

---

## 3. Parcelas de Pagamento

### 3.1. Pagar Parcela

**Endpoint:** `POST /api/sales/installments/:id/pay`

**Body:**

```json
{
  "paidAmount": 1425.00,
  "paymentMethodId": "uuid-forma-pagamento",
  "notes": "Pagamento via PIX"
}
```

**Campos Obrigatórios:**
- `paidAmount`: Valor pago

**Campos de Forma de Pagamento:**
- `paymentMethodId` (UUID, recomendado): ID da forma de pagamento cadastrada
- `paymentMethod` (string, alternativa): Nome da forma de pagamento (para compatibilidade)

**Exemplo de Requisição:**

```bash
curl -X POST "https://api.fingestor.com/api/sales/installments/uuid-parcela/pay" \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "paidAmount": 1425.00,
    "paymentMethodId": "uuid-pix",
    "notes": "Pagamento via PIX"
  }'
```

**Resposta de Sucesso (200):**

```json
{
  "id": "uuid-parcela",
  "sale_id": "uuid-venda",
  "installment_number": 2,
  "amount": 1425.00,
  "paid_amount": 1425.00,
  "due_date": "2026-03-07",
  "paid_at": "2026-02-10T14:30:00Z",
  "status": "paid",
  "payment_method": "PIX",
  "payment_method_id": "uuid-pix",
  "notes": "Pagamento via PIX",
  "created_at": "2026-02-07T10:00:00Z",
  "updated_at": "2026-02-10T14:30:00Z"
}
```

**Notas:**
- `paid_at` é preenchido automaticamente com data/hora atual
- Status da parcela muda para `paid`
- `payment_status` da venda é atualizado automaticamente:
  - `paid` se todas as parcelas estiverem pagas
  - `partial` se houver parcelas pendentes
- Campo `paid_amount` da venda é atualizado

---

## 4. Integração com Formas de Pagamento Customizáveis

O sistema PDV utiliza o módulo de **Formas de Pagamento Customizáveis** que permite:

- Cada empresa cadastrar suas próprias formas de pagamento
- Configurar taxas por forma de pagamento
- Configurar taxas específicas por número de parcelas (para cartões)
- Validar parcelamento automaticamente
- Calcular taxas automaticamente

**Documentação Completa:** [PAYMENT-METHODS-API-DOCUMENTATION.md](docs/PAYMENT-METHODS-API-DOCUMENTATION.md)

**Fluxo Recomendado ao Criar uma Venda:**

1. **Listar formas de pagamento** disponíveis
   ```bash
   GET /api/payment-methods?companyId=uuid-empresa
   ```

2. **Usuário seleciona** a forma de pagamento

3. **Se permitir parcelamento**, validar:
   - Número de parcelas <= `max_installments`
   - Valor por parcela >= `min_installment_amount`

4. **Calcular taxa** (se houver)
   ```bash
   POST /api/payment-methods/calculate-fee
   {
     "companyId": "uuid-empresa",
     "paymentMethodId": "uuid-forma",
     "amount": 1000.00,
     "installments": 3
   }
   ```

5. **Criar venda** usando `paymentMethodId`
   ```bash
   POST /api/sales
   {
     "companyId": "uuid-empresa",
     "paymentMethodId": "uuid-forma",
     "installments": 3,
     "items": [...]
   }
   ```

**Formas de Pagamento Padrão:**

Toda empresa possui "Dinheiro" como forma de pagamento padrão criada automaticamente.

---

## 5. Status da Venda

### Status Geral (`status`):
- `draft`: Rascunho (venda não finalizada)
- `completed`: Venda concluída e finalizada
- `cancelled`: Venda cancelada
- `refunded`: Venda reembolsada

### Status de Pagamento (`payment_status`):
- `pending`: Aguardando pagamento (tem parcelas pendentes)
- `partial`: Pagamento parcial (algumas parcelas pagas)
- `paid`: Totalmente pago (todas as parcelas pagas)
- `cancelled`: Pagamento cancelado
- `refunded`: Pagamento reembolsado

---

## 6. Status da Parcela

- `pending`: Aguardando pagamento
- `paid`: Paga
- `overdue`: Vencida (calculado no frontend se `due_date < hoje` e `status = pending`)
- `cancelled`: Cancelada

---

## Regras de Negócio

### Para o Frontend

1. **Vendas:**
   - Número gerado automaticamente: `VEN-YYYY-NNNNN`
   - Sempre verificar estoque antes de confirmar venda
   - Mostrar alerta se estoque ficar abaixo do mínimo após a venda
   - Permitir venda à vista (1 parcela) ou parcelada
   - À vista: `status = completed` e `payment_status = paid`
   - Parcelado: `status = completed` e `payment_status = pending` ou `partial`

2. **Controle de Estoque:**
   - **Automático na criação da venda** (trigger do banco)
   - **Automático no cancelamento** (função do banco)
   - Validar estoque disponível antes de permitir a venda
   - Produtos sem `track_inventory` não afetam estoque

3. **Parcelamento:**
   - Parcelas são criadas automaticamente ao criar venda
   - Primeira parcela pode ser paga imediatamente
   - Vencimentos automáticos (mensal)
   - Permitir pagamento antecipado de parcelas
   - Calcular e exibir parcelas vencidas

4. **Conversão de Orçamento:**
   - Apenas orçamentos `approved` podem ser convertidos
   - Campos editáveis na conversão: forma de pagamento, parcelas, data
   - Itens e valores vêm do orçamento
   - Link mantido (`budget_id`) para rastreabilidade

5. **Cancelamento:**
   - Apenas vendas com `payment_status = pending` ou `partial` podem ser canceladas
   - Estoque é devolvido automaticamente
   - Reembolso de parcelas pagas deve ser tratado manualmente
   - Registrar motivo do cancelamento no campo `cancellation_reason`

6. **Totais e Descontos:**
   - Cálculos feitos automaticamente no backend
   - Desconto pode ser por item ou geral
   - `paid_amount` é a soma das parcelas pagas
   - Saldo devedor = `total_amount - paid_amount`

## Fluxos Recomendados

### Venda Rápida (À Vista)

1. Selecionar cliente (ou criar novo)
2. Adicionar produtos ao carrinho
3. Verificar estoque disponível
4. Aplicar desconto se necessário
5. Selecionar forma de pagamento
6. Confirmar venda (estoque baixado automaticamente)
7. Emitir comprovante/nota

### Venda Parcelada

1. Selecionar cliente
2. Adicionar produtos ao carrinho
3. Verificar estoque disponível
4. Definir quantidade de parcelas
5. Revisar valores das parcelas (dividido igualmente)
6. Confirmar venda
7. Registrar pagamento da entrada (primeira parcela)
8. Gerar carnê/cobrança para parcelas futuras

### Conversão de Orçamento

1. Localizar orçamento aprovado
2. Clicar em "Converter em Venda"
3. Revisar itens e valores
4. Definir forma de pagamento
5. Definir parcelamento
6. Confirmar conversão
7. Processar como venda normal

### Gestão de Recebimentos

1. Dashboard com parcelas a vencer (hoje, semana, mês)
2. Marcar parcelas vencidas em vermelho
3. Notificação automática de vencimentos
4. Permitir pagamento rápido com leitura de código
5. Atualizar status da venda automaticamente
6. Emitir recibo de parcela

### Controle de Estoque no PDV

1. Ao adicionar produto no carrinho, mostrar estoque atual
2. Alertar se quantidade solicitada > estoque disponível
3. Após confirmar venda, estoque é baixado automaticamente
4. Se estoque ficar abaixo do mínimo, alertar para reposição
5. Permitir visualização de movimentações do produto

## Relatórios

Sugestões de relatórios úteis:

- **Vendas por Período:**
  - Total de vendas, ticket médio, quantidade de vendas
  - Filtros: data, vendedor, forma de pagamento, cliente

- **Contas a Receber:**
  - Parcelas pendentes agrupadas por vencimento
  - Valor total a receber
  - Parcelas vencidas (inadimplência)

- **Produtos Mais Vendidos:**
  - Ranking de produtos por quantidade e valor
  - Filtros por período

- **Taxa de Conversão:**
  - % de orçamentos convertidos em vendas
  - Tempo médio de conversão
  - Valor médio de conversão

- **Fluxo de Caixa:**
  - Entradas previstas (parcelas a receber)
  - Entradas realizadas (parcelas pagas)
  - Comparativo previsto vs realizado

## Exemplos de Integração

### Dashboard de Vendas

```bash
# Vendas do dia
curl -X GET "https://api.fingestor.com/api/sales?companyId=uuid&from=2026-02-07&to=2026-02-07&status=completed" \
  -H "Authorization: Bearer token"

# Parcelas a vencer hoje
curl -X GET "https://api.fingestor.com/api/sales?companyId=uuid&paymentStatus=pending" \
  -H "Authorization: Bearer token"
# Filtrar no frontend parcelas com due_date = hoje
```

### Fluxo Completo de Venda

```bash
# 1. Verificar estoque do produto
curl -X GET "https://api.fingestor.com/api/products-services/uuid-produto?companyId=uuid" \
  -H "Authorization: Bearer token"

# 2. Criar venda
curl -X POST "https://api.fingestor.com/api/sales" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{...}'

# 3. Pagar primeira parcela (se parcelado)
curl -X POST "https://api.fingestor.com/api/sales/uuid-venda/pay-installment/uuid-parcela?companyId=uuid" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "paidAmount": 1425.00,
    "paymentMethod": "money"
  }'
```
